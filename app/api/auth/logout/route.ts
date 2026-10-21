import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = (await cookies()).get("sessionToken")?.value;
  const payload = token ? await verifySession(token) : null;

  if (payload) {
    await prisma.session.updateMany({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("sessionToken");
  return res;
}
