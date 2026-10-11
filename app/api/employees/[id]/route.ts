import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

const schema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .optional(),
    role: z.enum(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]).optional(),
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

  if (data.role && id === auth.user.id) {
    return NextResponse.json(
      { error: "You can't change your own role" },
      { status: 403 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true, deactivatedAt: true },
      });
      if (!target) return { error: "User not found", status: 404 };

      if (!canManageUser(actorRole, target.role as Role)) {
        return {
          error: "You don't have permission to modify this account",
          status: 403,
        };
      }

      const roleChanging = !!data.role && data.role !== target.role;

      if (roleChanging && actorRole !== "ADMIN") {
        return { error: "Only administrators can change roles", status: 403 };
      }

      if (data.departmentId) {
        const dept = await tx.department.findUnique({
          where: { id: data.departmentId },
          select: { id: true },
        });
        if (!dept) return { error: "Department not found", status: 400 };
      }

      if (roleChanging && target.role === "ADMIN" && !target.deactivatedAt) {
        const activeAdmins = await tx.user.count({
          where: { role: "ADMIN", deactivatedAt: null },
        });
        if (activeAdmins <= 1) {
          return {
            error: "At least one active admin is required",
            status: 409,
          };
        }
      }

      await tx.user.update({ where: { id }, data });

      if (roleChanging) {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

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
