import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/session";
import { pushConfigured, sendPush } from "@/lib/push";

export async function POST() {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  if (!pushConfigured())
    return NextResponse.json(
      { error: "Push notifications are not set up on the server yet." },
      { status: 503 },
    );

  const result = await sendPush([
    {
      userId: auth.user.id,
      title: "Test notification",
      body: "Push notifications are working on this device.",
      href: "/dashboard/settings/notifications",
    },
  ]);

  if (result.devices === 0)
    return NextResponse.json(
      { error: "No device is registered for push yet. Turn it on first." },
      { status: 400 },
    );

  if (result.sent === 0)
    return NextResponse.json(
      {
        error:
          "The push service did not accept the message. Turn push off and on again, then retry.",
      },
      { status: 502 },
    );

  return NextResponse.json({ sent: result.sent });
}