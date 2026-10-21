import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { getCurrentSessionId } from "@/lib/auth/current-session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === (await getCurrentSessionId()))
    return NextResponse.json(
      { error: "Use the main log out button to log out of this device." },
      { status: 400 },
    );

  const { count } = await prisma.session.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (count === 0)
    return NextResponse.json({ error: "Device not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
