import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

const schema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string()).min(1).max(100) }),
]);

export async function PATCH(req: Request) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await prisma.notification.updateMany({
    where: {
      userId: auth.user.id, 
      readAt: null,
      ...("ids" in parsed.data ? { id: { in: parsed.data.ids } } : {}),
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}