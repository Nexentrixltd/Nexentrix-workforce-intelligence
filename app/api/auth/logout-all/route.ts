import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const others = new URL(req.url).searchParams.get("others") === "true";

  await prisma.session.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
      ...(others ? { id: { not: user.sessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  const res = NextResponse.json({ success: true });
  if (!others) res.cookies.delete("sessionToken");
  return res;
}
