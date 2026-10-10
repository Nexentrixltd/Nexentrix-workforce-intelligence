import { getSessionUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ valid: false }, { status: 401 });
  return NextResponse.json({ valid: true, user });
}