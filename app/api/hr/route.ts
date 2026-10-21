import { requireApiRole } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireApiRole(["HR"]);

  if (!auth.ok) return auth.response;

  return NextResponse.json({
    message: "Allowed data",
    user: auth.user,
  });
}
