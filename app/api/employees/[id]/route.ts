import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { ROLES, type Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

const ARM_ROLES: Role[] = ["ARM_HEAD", "CHIEF_OF_STAFF"];
const DEPARTMENTLESS_ROLES: Role[] = [
  "ARM_HEAD",
  "CHIEF_OF_STAFF",
  "EXECUTIVE",
];

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const schema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .optional(),
    role: z.enum(ROLES).optional(),
    departmentId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("EDIT_USER");
  if (!auth.ok) return auth.response;

  const actorRole = auth.user.role as Role;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.role && id === auth.user.id && data.role !== actorRole) {
    return NextResponse.json(
      { error: "You can't change your own role." },
      { status: 403 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true, deactivatedAt: true, departmentId: true },
      });
      if (!target) throw new RouteError("User not found", 404);

      if (!canManageUser(actorRole, target.role as Role)) {
        throw new RouteError(
          "You don't have permission to modify this account",
          403,
        );
      }

      const currentRole = target.role as Role;
      const nextRole = (data.role ?? currentRole) as Role;
      const roleChanging = nextRole !== currentRole;

      if (roleChanging && actorRole !== "ADMIN") {
        throw new RouteError("Only administrators can change roles", 403);
      }

      if (
        roleChanging &&
        (ARM_ROLES.includes(currentRole) || ARM_ROLES.includes(nextRole))
      ) {
        throw new RouteError(
          "Arm Head and Chief of Staff assignments are managed from the Arms page",
          409,
        );
      }

      let finalDepartmentId =
        data.departmentId === undefined
          ? target.departmentId
          : data.departmentId;

      if (DEPARTMENTLESS_ROLES.includes(nextRole)) {
        if (!roleChanging && finalDepartmentId !== target.departmentId) {
          throw new RouteError(
            "This role sits outside departments and can't be moved",
            400,
          );
        }
        if (roleChanging) finalDepartmentId = null;
      }

      const departmentChanging = finalDepartmentId !== target.departmentId;

      if (departmentChanging && finalDepartmentId) {
        const dept = await tx.department.findUnique({
          where: { id: finalDepartmentId },
          select: { id: true },
        });
        if (!dept) throw new RouteError("Department not found", 400);
      }

      if (roleChanging || departmentChanging) {
        const led = await tx.department.findMany({
          where: { teamLeadId: id },
          select: { name: true },
        });
        if (led.length > 0) {
          throw new RouteError(
            `This person leads ${led.map((d) => d.name).join(", ")}. Replace them as Team Lead from the Departments page first.`,
            409,
          );
        }
      }

      if (roleChanging && nextRole === "TEAM_LEAD") {
        if (!finalDepartmentId) {
          throw new RouteError(
            "Choose a department before making someone a Team Lead",
            400,
          );
        }
        const claimed = await tx.department.updateMany({
          where: { id: finalDepartmentId, teamLeadId: null },
          data: { teamLeadId: id, status: "ACTIVE" },
        });
        if (claimed.count === 0) {
          throw new RouteError(
            "That department already has a Team Lead. Replace them from the Departments page.",
            409,
          );
        }
      }

      if (roleChanging && currentRole === "ADMIN" && !target.deactivatedAt) {
        const activeAdmins = await tx.user.count({
          where: { role: "ADMIN", deactivatedAt: null },
        });
        if (activeAdmins <= 1) {
          throw new RouteError("At least one active admin is required", 409);
        }
      }

      await tx.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(roleChanging && { role: nextRole }),
          ...(departmentChanging && { departmentId: finalDepartmentId }),
        },
      });

      if (roleChanging) {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ success: true });
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
        { error: "That email is already in use" },
        { status: 409 },
      );
    }
    console.error("[Update User] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
