import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/jwt";
import { roleRoutes } from "./types/rbac";
import { isSessionActive, sessionIdFromPayload } from "./lib/session-active";

const access: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/hr": ["HR", "ADMIN"],
  "/staff": ["STAFF", "ADMIN"],
  "/team-lead": ["TEAM_LEAD", "ADMIN"],
};

function toLogin(req: NextRequest, clearCookie: boolean) {
  const url = new URL("/auth", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  const res = NextResponse.redirect(url);
  if (clearCookie) res.cookies.delete("sessionToken");
  return res;
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("sessionToken")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) return toLogin(req, !!token);

  const sessionId = sessionIdFromPayload(session);
  if (sessionId && !(await isSessionActive(sessionId)))
    return toLogin(req, true);

  const { pathname } = req.nextUrl;
  const section = Object.keys(access).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (section && !access[section].includes(session.role)) {
    const home = roleRoutes[session.role as keyof typeof roleRoutes] ?? "/auth";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/hr/:path*",
    "/staff/:path*",
    "/team-lead/:path*",
    "/dashboard/:path*",
  ],
};
