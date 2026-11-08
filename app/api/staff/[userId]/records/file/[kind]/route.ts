import { NextResponse } from "next/server";
import { getSessionUser, requireApiRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getRecordKey,
  isRecordKind,
  streamPrivateImage,
} from "@/lib/records-storage";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string; kind: string }> },
) {
  await requireApiRole(RECORD_REVIEWERS);
  const actor = await getSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, kind } = await params;
  if (!isRecordKind(kind)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = await getRecordKey(userId, kind);
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (kind === "signature") {
    await prisma.sensitiveAccessLog.create({
      data: {
        actorId: actor.id,
        targetUserId: userId,
        field: "signatory.signature",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
  }

  return streamPrivateImage(key);
}
