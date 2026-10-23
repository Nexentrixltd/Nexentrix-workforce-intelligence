import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

const MAX_DEVICES_PER_USER = 10;

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((url) => url.startsWith("https://"), "Endpoint must use https"),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
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

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent");

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  const extra = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_DEVICES_PER_USER,
    select: { id: true },
  });
  if (extra.length > 0)
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: extra.map((s) => s.id) } },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const parsed = z
    .object({ endpoint: z.string().min(1).max(2048) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: auth.user.id },
  });

  return NextResponse.json({ ok: true });
}
