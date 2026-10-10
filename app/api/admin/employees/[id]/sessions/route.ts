import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "You can't sign yourself out from here" },
      { status: 403 }
    );
  }

  try {
    const { count } = await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ success: true, revoked: count });
  } catch (error) {
    console.error("[Revoke Sessions] Failed:", error);
    return NextResponse.json({ error: "Failed to sign user out" }, { status: 500 });
  }
}