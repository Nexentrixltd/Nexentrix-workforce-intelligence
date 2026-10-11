import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiRole, requireApiPermission } from "@/lib/auth/session";
import { canAssignRole } from "@/lib/permissions";
import { generateTempPassword } from "@/lib/auth/tempPasswordGenerator";
import { Role } from "@/types/rbac";

export async function GET(req: Request) {
  const auth = await requireApiPermission("VIEW_USERS");
  if (!auth.ok) return auth.response;

  const departmentId = new URL(req.url).searchParams.get("departmentId");

  try {
    const users = await prisma.user.findMany({
      where: departmentId
        ? { OR: [{ departmentId: null }, { departmentId }] }
        : { departmentId: null },
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

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]),
  departmentId: z.string().min(1).nullable().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission("CREATE_USER");
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, role, departmentId } = parsed.data;

  if (!canAssignRole(auth.user.role as Role, role)) {
    return NextResponse.json(
      { error: "You can't create accounts with this role." },
      { status: 403 },
    );
  }

  try {
    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });
      if (!dept) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 400 },
        );
      }
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        isFirstLogin: true,
        departmentId: departmentId ?? null,
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(
      { user, temporaryPassword },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
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
