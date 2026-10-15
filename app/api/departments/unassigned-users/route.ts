
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

export async function GET() {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const users = await prisma.user.findMany({
      where: { departmentId: '' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[Unassigned Users] Failed:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}