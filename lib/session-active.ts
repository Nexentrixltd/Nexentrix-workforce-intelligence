import { prisma } from "@/lib/prisma";

export function sessionIdFromPayload(payload: object): string | null {
  const claims = payload as Record<string, unknown>;
  for (const key of ["sid", "sessionId"]) {
    const value = claims[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

const TTL_MS = 15_000;
const cache = new Map<string, { active: boolean; checkedAt: number }>();

export async function isSessionActive(
  sessionId: string,
  options?: { fresh?: boolean }, 
): Promise<boolean> {
  const hit = cache.get(sessionId);
  if (!options?.fresh && hit && Date.now() - hit.checkedAt < TTL_MS)
    return hit.active;

  try {
    const row = await prisma.session.findFirst({
      where: { id: sessionId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    const active = !!row;

    if (cache.size > 1000) cache.clear();
    cache.set(sessionId, { active, checkedAt: Date.now() });
    return active;
  } catch (error) {
    console.error("[auth] session check failed", error);
    return true;
  }
}
