import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ active: z.boolean() });

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { active } = parsed.data;

  if (!active && id === auth.user.id) {
    return NextResponse.json(
      { error: "You can't deactivate your own account" },
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

      if (!active) {
        if (target.role === "ADMIN" && !target.deactivatedAt) {
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

        await tx.user.update({
          where: { id },
          data: { deactivatedAt: new Date() },
        });
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } else {
        await tx.user.update({ where: { id }, data: { deactivatedAt: null } });
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
    console.error("[User Status] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
