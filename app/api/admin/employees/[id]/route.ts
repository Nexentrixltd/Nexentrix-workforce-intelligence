import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

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
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
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
      if (!target) return { error: "Employee not found", status: 404 };

      if (data.departmentId) {
        const dept = await tx.department.findUnique({
          where: { id: data.departmentId },
          select: { id: true },
        });
        if (!dept) return { error: "Department not found", status: 400 };
      }

      const roleChanging = !!data.role && data.role !== target.role;

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
