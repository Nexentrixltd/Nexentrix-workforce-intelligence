import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { getCurrentSessionId } from "@/lib/auth/current-session";

const ALL_ROLES = ["ADMIN", "HR", "TEAM_LEAD", "STAFF", "EXECUTIVE"] as const;

export async function GET() {
  const auth = await requireApiRole([...ALL_ROLES]);
  if (!auth.ok) return auth.response;

  const currentId = await getCurrentSessionId();

  const rows = await prisma.session.findMany({
    where: { userId: auth.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ip: true, createdAt: true },
  });

  const items = rows.map((r) => ({
    id: r.id,
    userAgent: r.userAgent,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
    current: r.id === currentId,
  }));
  items.sort((a, b) => Number(b.current) - Number(a.current));

  return NextResponse.json(items);
}

export async function DELETE() {
  const auth = await requireApiRole([...ALL_ROLES]);
  if (!auth.ok) return auth.response;

  const currentId = await getCurrentSessionId();
  if (!currentId)
    return NextResponse.json(
      { error: "We could not identify this device. Please log in again." },
      { status: 400 },
    );

  const { count } = await prisma.session.deleteMany({
    where: { userId: auth.user.id, NOT: { id: currentId } },
  });

  return NextResponse.json({ loggedOut: count });
}
