import { prisma } from "@/lib/prisma"; 
import { streamPrivateFile } from "@/lib/records-storage";
import { getSelf, notFound, unauthorized } from "@/lib/staff-records/service";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const { id } = await params;
  const doc = await prisma.staffDocument.findFirst({
    where: { id, userId: user.id },
    select: { fileKey: true, mimeType: true, fileName: true },
  });
  if (!doc) return notFound();

  const download = new URL(req.url).searchParams.get("download") === "1";

  return streamPrivateFile(doc.fileKey, {
    mimeType: doc.mimeType,
    fileName: doc.fileName,
    download,
  });
}
