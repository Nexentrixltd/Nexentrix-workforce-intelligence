import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/session";
import { getPusherServer } from "@/lib/notifications";

export async function POST(req: Request) {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const pusher = getPusherServer();
  if (!pusher)
    return NextResponse.json(
      { error: "Realtime is not configured" },
      { status: 503 },
    );

  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  if (channel !== `private-user-${auth.user.id}`)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
