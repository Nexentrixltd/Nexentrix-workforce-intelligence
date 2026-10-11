import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Code: letters, numbers and dashes only")
    .transform((v) => v.toUpperCase()),
  userIds: z.array(z.string().min(1)).max(500).default([]),
});

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("VIEW_DEPARTMENTS");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        users: { select: { id: true } },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        userIds: department.users.map((u) => u.id),
      },
    });
  } catch (error) {
    console.error("[Get Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to load department" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("EDIT_DEPARTMENT");
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

  const { name, code } = parsed.data;
  const requested = [...new Set(parsed.data.userIds)];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
        select: { users: { select: { id: true, role: true } } },
      });
      if (!department) return { error: "Department not found", status: 404 };

      const currentIds = new Set(department.users.map((u) => u.id));
      let finalIds = requested;

      // Only people this actor may manage can be added; accounts they may not
      // manage (e.g. ADMIN/HR for HR) stay exactly as they are.
      const lockedIds = department.users
        .filter((u) => !canManageUser(actorRole, u.role as Role))
        .map((u) => u.id);

      const newIds = requested.filter((uid) => !currentIds.has(uid));
      if (newIds.length > 0) {
        const newUsers = await tx.user.findMany({
          where: { id: { in: newIds } },
          select: { role: true },
        });
        if (newUsers.some((u) => !canManageUser(actorRole, u.role as Role))) {
          return {
            error: "You can't assign those accounts to a department",
            status: 403,
          };
        }
      }

      finalIds = [...new Set([...requested, ...lockedIds])];

      if (finalIds.length > 0) {
        const available = await tx.user.count({
          where: {
            id: { in: finalIds },
            OR: [{ departmentId: null }, { departmentId: id }],
          },
        });
        if (available !== finalIds.length) {
          return {
            error: "Some selected users are missing or in another department",
            status: 400,
          };
        }
      }

      await tx.department.update({
        where: { id },
        data: {
          name,
          code,
          users: { set: finalIds.map((uid) => ({ id: uid })) },
        },
      });

      return { ok: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 },
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A department with that name or code already exists" },
          { status: 409 },
        );
      }
    }
    console.error("[Update Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}
