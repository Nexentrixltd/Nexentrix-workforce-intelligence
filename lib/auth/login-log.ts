import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyIfNewDevice } from "../notifications/events";

export function getClientInfo(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;
  return { ip, userAgent };
}

export async function recordLogin(data: {
  userId?: string | null;
  sessionId?: string | null;
  email: string;
  success: boolean;
  reason?: string;
  ip: string | null;
  userAgent: string | null;
}) {
  const { userId, sessionId, email, success, reason, ip, userAgent } = data;

  try {
    await prisma.loginEvent.create({
      data: {
        email: email.slice(0, 254),
        success,
        reason,
        ip,
        userAgent,

        ...(userId
          ? {
              user: {
                connect: { id: userId },
              },
            }
          : {}),

        ...(sessionId
          ? {
              session: {
                connect: { id: sessionId },
              },
            }
          : {}),
      },
    });

    if (success && userId && sessionId) {
      try {
        await notifyIfNewDevice({
          userId,
          sessionId,
          userAgent,
          ip,
        });
      } catch (error) {
        console.error("[auth] New-device notification failed:", error);
      }
    }
  } catch (error) {
    console.error("[auth] Login logging failed:", error);
  }
}
