import { NextResponse } from "next/server";
import { getSessionUser, requireApiRole } from "@/lib/auth/session"; 
import { prisma } from "@/lib/prisma"; 
import { streamPrivateFile } from "@/lib/records-storage";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string; id: string }> },
) {
  const actorData = await requireApiRole(RECORD_REVIEWERS);
  const actor = await getSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, id } = await params;
  const doc = await prisma.staffDocument.findFirst({
    where: { id, userId },
    select: { type: true, fileKey: true, mimeType: true, fileName: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.type !== "PASSPORT_PHOTO") {
    await prisma.sensitiveAccessLog.create({
      data: {
        actorId: actor.id,
        targetUserId: userId,
        field: `document.${doc.type.toLowerCase()}`,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";

  return streamPrivateFile(doc.fileKey, {
    mimeType: doc.mimeType,
    fileName: doc.fileName,
    download,
  });
}
