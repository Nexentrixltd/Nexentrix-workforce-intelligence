import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validations/password";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.isFirstLogin) {
    return NextResponse.json(
      { error: "Password change is not required for this account" },
      { status: 400 },
    );
  }

  const parsed = changePasswordSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matches = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { error: "Temporary password is incorrect" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, isFirstLogin: false },
      }),
      prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          id: { not: user.sessionId },
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Change Password] Failed:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
