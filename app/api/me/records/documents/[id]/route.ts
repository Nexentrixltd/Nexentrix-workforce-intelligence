import { NextResponse } from "next/server";
import { DetailStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 
import {
  badRequest,
  discardOldFile,
  getSelf,
  notFound,
  unauthorized,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const { id } = await params;
  const doc = await prisma.staffDocument.findFirst({
    where: { id, userId: user.id },
  });
  if (!doc) return notFound();

  if (doc.status === DetailStatus.VERIFIED) {
    return badRequest(
      "HR has verified this document. Ask HR if it needs to be removed.",
      403,
    );
  }

  await prisma.staffDocument.delete({ where: { id } });
  await discardOldFile(doc.fileKey, doc.mimeType);

  return NextResponse.json({ ok: true });
}
