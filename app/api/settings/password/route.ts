import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { getCurrentSessionId } from "@/lib/auth/current-session";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Use 128 characters or fewer"),
});

export async function POST(req: Request) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const { currentPassword, newPassword } = parsed.data;

  if (newPassword === currentPassword)
    return NextResponse.json(
      {
        error: {
          newPassword: ["Choose a password different from your current one"],
        },
      },
      { status: 400 },
    );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  const valid =
    !!user?.passwordHash &&
    (await bcrypt.compare(currentPassword, user.passwordHash)); 
  if (!valid)
    return NextResponse.json(
      { error: { currentPassword: ["Your current password is incorrect"] } },
      { status: 400 },
    );

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }, 
  });

  const currentId = await getCurrentSessionId();
  if (currentId)
    await prisma.session.deleteMany({
      where: { userId, NOT: { id: currentId } },
    });

  return NextResponse.json({ ok: true });
}
