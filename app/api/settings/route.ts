import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

const patchSchema = z.object({
  reminderEnabled: z.boolean(),
});

export async function GET() {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      reminderEnabled: true,
      department: { select: { name: true } },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: user.role,
    department: user.department?.name ?? null,
    memberSince: user.createdAt.toISOString().slice(0, 10),
    reminderEnabled: user.role === "STAFF" ? user.reminderEnabled : null,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireApiRole(["STAFF"]);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { reminderEnabled: parsed.data.reminderEnabled },
  });

  return NextResponse.json({ reminderEnabled: parsed.data.reminderEnabled });
}