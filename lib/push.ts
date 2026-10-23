import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

export function pushConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushMessage = {
  userId: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function deliver(
  subscription: Subscription,
  message: PushMessage,
): Promise<"sent" | "removed" | "failed"> {
  const payload = JSON.stringify({
    title: message.title,
    body: message.body ?? "",
    href: message.href ?? "/",
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription
        .deleteMany({ where: { id: subscription.id } })
        .catch(() => null);
      return "removed";
    }
    console.error("[push] delivery failed", status, (error as Error).message);
    return "failed";
  }
}

export async function sendPush(messages: PushMessage[]) {
  const result = { devices: 0, sent: 0, removed: 0, failed: 0 };

  try {
    if (messages.length === 0 || !pushConfigured()) return result;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: [...new Set(messages.map((m) => m.userId))] } },
      select: {
        id: true,
        userId: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (subscriptions.length === 0) return result;

    const byUser = new Map<string, typeof subscriptions>();

    for (const subscription of subscriptions) {
      const list = byUser.get(subscription.userId) ?? [];
      list.push(subscription);
      byUser.set(subscription.userId, list);
    }
    
    const outcomes = await Promise.all(
      messages.flatMap((message) =>
        (byUser.get(message.userId) ?? []).map((s) => deliver(s, message)),
      ),
    );

    result.devices = outcomes.length;
    for (const outcome of outcomes) result[outcome]++;
  } catch (error) {
    console.error("[push] sendPush failed", error);
  }

  return result;
}
