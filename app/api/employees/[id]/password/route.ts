import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";
import { generateTempPassword } from "@/lib/auth/tempPasswordGenerator";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("RESET_USER_PASSWORD");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "Change your own password from your account settings" },
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

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { passwordHash, isFirstLogin: true },
      }),
      prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      { temporaryPassword },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Reset Password] Failed:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
