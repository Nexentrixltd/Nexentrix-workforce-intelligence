import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { categoriesForRole } from "@/lib/notifications/notification-prefs";

const userSelect = {
  role: true,
  mutedNotifications: true,
  reminderEnabled: true,
} as const;

type PrefsUser = {
  role: string;
  mutedNotifications: string[];
  reminderEnabled: boolean;
};

function toResponse(user: PrefsUser) {
  const muted = new Set(user.mutedNotifications);
  return {
    categories: categoriesForRole(user.role).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      enabled: !muted.has(c.id),
    })),
    dailyReminder: user.role === "STAFF" ? user.reminderEnabled : null,
  };
}

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
    select: userSelect,
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(toResponse(user));
}

const patchSchema = z.object({
  categories: z.record(z.string(), z.boolean()).optional(),
  dailyReminder: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { categories = {}, dailyReminder } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: userSelect,
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const allowed = new Set(categoriesForRole(user.role).map((c) => c.id));
  if (Object.keys(categories).some((id) => !allowed.has(id)))
    return NextResponse.json(
      { error: "One of those notification types does not apply to you." },
      { status: 400 },
    );

  if (dailyReminder !== undefined && user.role !== "STAFF")
    return NextResponse.json(
      { error: "Daily report reminders only apply to staff." },
      { status: 403 },
    );

  const muted = new Set(user.mutedNotifications);
  for (const [id, enabled] of Object.entries(categories)) {
    if (enabled) muted.delete(id);
    else muted.add(id);
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      mutedNotifications: [...muted],
      ...(dailyReminder !== undefined && { reminderEnabled: dailyReminder }),
    },
    select: userSelect,
  });

  return NextResponse.json(toResponse(updated));
}