import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/auth/tempPasswordGenerator";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
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
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
