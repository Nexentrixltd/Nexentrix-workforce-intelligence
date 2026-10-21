import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ active: z.boolean() });

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("DEACTIVATE_USER");
  if (!auth.ok) return auth.response;

  const actorRole = auth.user.role as Role;
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
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { name: true, role: true, deactivatedAt: true },
      });
      if (!target) throw new RouteError("User not found", 404);

      if (!canManageUser(actorRole, target.role as Role)) {
        throw new RouteError(
          "You don't have permission to modify this account",
          403,
        );
      }

      if (active) {
        if (target.deactivatedAt) {
          await tx.user.update({
            where: { id },
            data: { deactivatedAt: null },
          });
        }
        return;
      }

      if (target.deactivatedAt) return;

      if (target.role === "ADMIN") {
        const activeAdmins = await tx.user.count({
          where: { role: "ADMIN", deactivatedAt: null },
        });
        if (activeAdmins <= 1) {
          throw new RouteError("At least one active admin is required", 409);
        }
      }

      const [headedArm, ledDepartments] = await Promise.all([
        tx.arm.findFirst({ where: { headId: id }, select: { name: true } }),
        tx.department.findMany({
          where: { teamLeadId: id },
          select: { name: true },
        }),
      ]);

      if (headedArm) {
        throw new RouteError(
          `${target.name} heads ${headedArm.name}. Assign a replacement from the Arms page first.`,
          409,
        );
      }
      if (ledDepartments.length > 0) {
        throw new RouteError(
          `${target.name} leads ${ledDepartments.map((d) => d.name).join(", ")}. Replace them as Team Lead from the Departments page first.`,
          409,
        );
      }

      await tx.user.update({
        where: { id },
        data: { deactivatedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[User Status] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
