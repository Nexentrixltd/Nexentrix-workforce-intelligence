import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/session";
import { createUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  const auth = await requireApiRole(["STAFF"]);
  if (!auth.ok) return auth.response;
  return NextResponse.json(createUploadSignature(auth.user.id));
}
