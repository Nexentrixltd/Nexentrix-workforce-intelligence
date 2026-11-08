import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getRecordKey,
  isRecordKind,
  streamPrivateImage,
} from "@/lib/records-storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { kind } = await params;
  if (!isRecordKind(kind)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = await getRecordKey(user.id, kind);
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return streamPrivateImage(key);
}
