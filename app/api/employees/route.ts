import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canAssignRole } from "@/lib/permissions";
import { generateTempPassword } from "@/lib/auth/tempPasswordGenerator";
import { Role } from "@/types/rbac";
import { employeeSchema } from "@/lib/validations/employee";

const EXEC_DEPARTMENT_SLUG = "executive-board-office";

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function GET(req: Request) {
  const auth = await requireApiPermission("VIEW_USERS");
  if (!auth.ok) return auth.response;

  const departmentId = new URL(req.url).searchParams.get("departmentId");

  try {
    const users = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        role: { in: ["STAFF", "TEAM_LEAD", "HR"] },
        ...(departmentId
          ? { OR: [{ departmentId: null }, { departmentId }] }
          : { departmentId: null }),
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[Users] Failed:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireApiPermission("CREATE_USER");
  if (!auth.ok) return auth.response;

  const parsed = employeeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, role, departmentId, armId } = parsed.data;

  if (!canAssignRole(auth.user.role as Role, role as Role)) {
    return NextResponse.json(
      { error: "You can't create accounts with this role." },
      { status: 403 },
    );
  }

  try {
    let homeDepartmentId: string | null = departmentId ?? null;
    let claimArmId: string | null = null;
    let execDepartmentId: string | null = null;

    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, teamLeadId: true },
      });
      if (!dept) throw new RouteError("Department not found", 400);
      if (role === "TEAM_LEAD" && dept.teamLeadId) {
        throw new RouteError(
          "This department already has a Team Lead. Reassign the lead from the department page.",
          409,
        );
      }
    }

    if (role === "ARM_HEAD") {
      const arm = await prisma.arm.findUnique({
        where: { id: armId! },
        select: { id: true, isShared: true, headId: true },
      });
      if (!arm || arm.isShared) {
        throw new RouteError(
          "Choose a valid Arm (Technologies, Nexlearn or Nexora.)",
          400,
        );
      }
      if (arm.headId) throw new RouteError("This arm already has a head", 409);
      claimArmId = arm.id;
      homeDepartmentId = null;
    }

    if (role === "CHIEF_OF_STAFF") {
      const [shared, exec] = await Promise.all([
        prisma.arm.findFirst({
          where: { isShared: true },
          select: { id: true, headId: true },
        }),
        prisma.department.findUnique({
          where: { slug: EXEC_DEPARTMENT_SLUG },
          select: { id: true },
        }),
      ]);
      if (!shared || !exec)
        throw new RouteError(
          "Organization structure is not seeded. Run the seed first.",
          500,
        );
      if (shared.headId)
        throw new RouteError("A Chief of Staff already exists", 409);
      claimArmId = shared.id;
      execDepartmentId = exec.id;
      homeDepartmentId = exec.id;
    }

    if (role === "EXECUTIVE") homeDepartmentId = null;

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          role,
          passwordHash,
          isFirstLogin: true,
          departmentId: homeDepartmentId,
        },
        select: { id: true, name: true, email: true },
      });

      if (role === "TEAM_LEAD" && departmentId) {
        const claimed = await tx.department.updateMany({
          where: { id: departmentId, teamLeadId: null },
          data: { teamLeadId: created.id, status: "ACTIVE" },
        });
        if (claimed.count === 0) {
          throw new RouteError("This department already has a Team Lead", 409);
        }
      }

      if (claimArmId) {
        const claimed = await tx.arm.updateMany({
          where: { id: claimArmId, headId: null },
          data: { headId: created.id },
        });
        if (claimed.count === 0) {
          throw new RouteError("This arm already has a head", 409);
        }
      }

      if (role === "CHIEF_OF_STAFF" && execDepartmentId) {
        await tx.department.updateMany({
          where: { id: execDepartmentId, teamLeadId: null },
          data: { teamLeadId: created.id, status: "ACTIVE" },
        });
      }

      return created;
    });

    return NextResponse.json(
      { user, temporaryPassword },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 },
      );
    }
    console.error("[Create User] Failed:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
