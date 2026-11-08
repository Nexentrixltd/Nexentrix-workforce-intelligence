import { NextResponse } from "next/server";
import { DetailStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; // adjust path
import { documentUploadSchema } from "@/lib/validations/staff-records";
import {
  DOCUMENT_LABELS,
  IMAGE_ONLY_TYPES,
  MAX_DOCUMENTS_PER_USER,
  MAX_DOCUMENT_BYTES,
  SINGLE_FILE_TYPES,
} from "@/lib/staff-records/documents";
import {
  MIME_BY_TYPE,
  detectFileType,
  uploadPrivateDocument,
} from "@/lib/records-storage";
import {
  badRequest,
  discardOldFile,
  fieldError,
  getSelf,
  notifyReviewers,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

const SELECT = {
  id: true,
  type: true,
  title: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  reviewNote: true,
  createdAt: true,
} as const;

const cleanFileName = (name: string) =>
  name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || "document";

export async function GET() {
  const user = await getSelf();
  if (!user) return unauthorized();

  const documents = await prisma.staffDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: SELECT,
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return badRequest("Invalid form data");

  const parsed = documentUploadSchema.safeParse({
    type: form.get("type"),
    title: form.get("title") ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error);
  const { type } = parsed.data;
  const title = parsed.data.title?.trim() || null;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fieldError("file", "Choose a file to upload");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return fieldError(
      "file",
      `File is too large (max ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB)`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = detectFileType(buffer);
  if (!fileType) {
    return fieldError("file", "Only JPG, PNG, WebP or PDF files are allowed");
  }
  if (IMAGE_ONLY_TYPES.includes(type) && fileType === "pdf") {
    return fieldError("file", "This must be an image (JPG, PNG or WebP)");
  }

  // Single-file types (passport photograph) replace the existing file.
  const replaced = SINGLE_FILE_TYPES.includes(type)
    ? await prisma.staffDocument.findMany({
        where: { userId: user.id, type },
        select: { id: true, fileKey: true, mimeType: true },
      })
    : [];

  const total = await prisma.staffDocument.count({
    where: { userId: user.id },
  });
  if (total - replaced.length >= MAX_DOCUMENTS_PER_USER) {
    return badRequest(
      `You can store up to ${MAX_DOCUMENTS_PER_USER} documents. Remove one first.`,
      409,
    );
  }

  const hadPending =
    (await prisma.staffDocument.count({
      where: { userId: user.id, status: DetailStatus.PENDING },
    })) > 0;

  let key: string;
  try {
    key = await uploadPrivateDocument(
      user.id,
      buffer,
      fileType,
      type === "PASSPORT_PHOTO" ? 1200 : 2400,
    );
  } catch {
    return badRequest("Upload failed. Please try again.", 502);
  }

  const mimeType = MIME_BY_TYPE[fileType];

  let document;
  try {
    document = await prisma.$transaction(async (tx) => {
      if (replaced.length > 0) {
        await tx.staffDocument.deleteMany({
          where: { id: { in: replaced.map((d) => d.id) } },
        });
      }
      return tx.staffDocument.create({
        data: {
          userId: user.id,
          type,
          title,
          fileKey: key,
          fileName: cleanFileName(file.name),
          mimeType,
          sizeBytes: file.size,
        },
        select: SELECT,
      });
    });
  } catch (err) {
    console.error("Saving document failed", err);
    await discardOldFile(key, mimeType);
    return badRequest("Could not save the document. Please try again.", 500);
  }

  for (const old of replaced) await discardOldFile(old.fileKey, old.mimeType);

  if (!hadPending) {
    await notifyReviewers(user.id, `a document (${DOCUMENT_LABELS[type]})`);
  }

  return NextResponse.json({ document }, { status: 201 });
}
