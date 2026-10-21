import Pusher from "pusher";
import { prisma } from "@/lib/prisma";

let instance: Pusher | null = null;

export function getPusherServer() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
    process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER)
    return null;
  instance ??= new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return instance;
}

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

export async function notify(input: NotificationInput | NotificationInput[]) {
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return;

  try {
    const created = await prisma.$transaction(
      list.map((n) =>
        prisma.notification.create({
          data: {
            userId: n.userId,
            type: n.type,
            title: n.title,
            body: n.body ?? null,
            href: n.href ?? null,
          },
          select: {
            id: true,
            userId: true,
            type: true,
            title: true,
            body: true,
            href: true,
            readAt: true,
            createdAt: true,
          },
        }),
      ),
    );

    const pusher = getPusherServer();
    if (pusher) {
      await Promise.allSettled(
        created.map((n) =>
          pusher.trigger(`private-user-${n.userId}`, "notification", {
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            href: n.href,
            readAt: null,
            createdAt: n.createdAt.toISOString(),
          }),
        ),
      );
    }
  } catch (e) {
    console.error("notify failed", e);
  }
}

const PREFIX: Record<string, string> = {
  ADMIN: "admin",
  HR: "hr",
  TEAM_LEAD: "team-lead",
  STAFF: "staff",
};

export const projectHref = (role: string | undefined, id: string) =>
  `/${PREFIX[role ?? ""] ?? "staff"}/projects/${id}`;

export const reportsHref = (role: string | undefined) =>
  `/${PREFIX[role ?? ""] ?? "staff"}/reports`;
