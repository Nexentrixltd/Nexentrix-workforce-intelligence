import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/jwt";
import { roleRoutes } from "@/lib/utils";

const access: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/hr": ["HR", "ADMIN"],
  "/staff": ["STAFF", "ADMIN"],
  "/team-lead": ["TEAM_LEAD", "ADMIN"],
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("sessionToken")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const res = NextResponse.redirect(new URL("/auth", req.url));
    if (token) res.cookies.delete("sessionToken"); 
    return res;
  }

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
  matcher: ["/admin/:path*", "/hr/:path*", "/staff/:path*", "/team-lead/:path*"],
};