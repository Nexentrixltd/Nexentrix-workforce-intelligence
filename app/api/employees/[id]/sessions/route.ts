import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("REVOKE_USER_SESSIONS");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "You can't sign yourself out from here" },
      { status: 403 },
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canManageUser(auth.user.role as Role, target.role as Role)) {
      return NextResponse.json(
        { error: "You don't have permission to modify this account" },
        { status: 403 },
      );
    }

    const { count } = await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ success: true, revoked: count });
  } catch (error) {
    console.error("[Revoke Sessions] Failed:", error);
    return NextResponse.json(
      { error: "Failed to sign user out" },
      { status: 500 },
    );
  }
}
