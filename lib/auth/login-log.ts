import "server-only";
import { prisma } from "@/lib/prisma";

export function getClientInfo(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;
  return { ip, userAgent };
}

export async function recordLogin(data: {
  userId?: string | null;
  email: string;
  success: boolean;
  reason?: string;
  ip: string | null;
  userAgent: string | null;
}) {
  try {
    await prisma.loginEvent.create({
      data: { ...data, email: data.email.slice(0, 254) },
    });
  } catch (err) {
    console.error("login log failed", err);
  }
}
