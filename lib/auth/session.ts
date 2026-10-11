import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { hasPermission, roleRoutes, type Permission, type Role } from "@/types/rbac";
import { NextResponse } from "next/server";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type ApiAuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { ok: false; response: NextResponse };

export const getSessionUser = cache(async () => {
  const token = (await cookies()).get("sessionToken")?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          deactivatedAt: true,
          isFirstLogin: true,
        },
      },
    },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.user.deactivatedAt
  ) {
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }

  return { ...session.user, sessionId: session.id };
});

export async function requireRole(allowed: Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  if (!allowed.includes(user.role as Role)) {
    redirect(roleRoutes[user.role as Role] ?? "/auth");
  }
  return user;
}

function passwordChangeRequired(): ApiAuthResult {
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
      { status: 403 },
    ),
  };
}

export async function requireApiRole(allowed: Role[]): Promise<ApiAuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.isFirstLogin) return passwordChangeRequired();

  if (!allowed.includes(user.role as Role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}

export async function requireApiPermission(
  permission: Permission,
): Promise<ApiAuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.isFirstLogin) return passwordChangeRequired();

  if (!hasPermission(user.role as Role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
