import "server-only";
import { randomBytes } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const RECORD_KINDS = {
  signature: { maxBytes: 1 * 1024 * 1024, maxDim: 1200 },
  photo: { maxBytes: 2 * 1024 * 1024, maxDim: 1000 },
} as const;

export type RecordKind = keyof typeof RECORD_KINDS;

export const isRecordKind = (v: string): v is RecordKind =>
  Object.hasOwn(RECORD_KINDS, v);

const FOLDER = "nexentrix/records";

export type FileType = "jpeg" | "png" | "webp" | "pdf";

export const MIME_BY_TYPE: Record<FileType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function detectFileType(buf: Buffer): FileType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "png";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "pdf";
  return null;
}

export function detectImageType(buf: Buffer): "jpeg" | "png" | "webp" | null {
  const t = detectFileType(buf);
  return t === "pdf" ? null : t;
}

export const resourceTypeFor = (mimeType: string): "image" | "raw" =>
  mimeType === "application/pdf" ? "raw" : "image";

export const isOwnedKey = (userId: string, kind: RecordKind, key: string) =>
  key.startsWith(`${FOLDER}/${userId}/${kind}-`) && !key.includes("..");

export function uploadPrivateImage(
  userId: string,
  kind: RecordKind,
  buffer: Buffer,
): Promise<string> {
  const { maxDim } = RECORD_KINDS[kind];
  const publicId = `${FOLDER}/${userId}/${kind}-${randomBytes(8).toString("hex")}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          type: "authenticated",
          resource_type: "image",
          overwrite: false,
          transformation: [{ width: maxDim, height: maxDim, crop: "limit" }],
        },
        (err, result) =>
          err || !result
            ? reject(err ?? new Error("Upload failed"))
            : resolve(result.public_id),
      )
      .end(buffer);
  });
}

export function uploadPrivateDocument(
  userId: string,
  buffer: Buffer,
  fileType: FileType,
  maxDim = 2400,
): Promise<string> {
  const isPdf = fileType === "pdf";
  const publicId = `${FOLDER}/${userId}/documents/doc-${randomBytes(8).toString("hex")}${
    isPdf ? ".pdf" : ""
  }`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          type: "authenticated",
          resource_type: isPdf ? "raw" : "image",
          overwrite: false,
          ...(isPdf
            ? {}
            : {
                transformation: [
                  { width: maxDim, height: maxDim, crop: "limit" },
                ],
              }),
        },
        (err, result) =>
          err || !result
            ? reject(err ?? new Error("Upload failed"))
            : resolve(result.public_id),
      )
      .end(buffer);
  });
}

export async function deletePrivateImage(key: string) {
  await cloudinary.uploader.destroy(key, {
    type: "authenticated",
    resource_type: "image",
    invalidate: true,
  });
}

export async function deletePrivateFile(key: string, mimeType: string) {
  await cloudinary.uploader.destroy(key, {
    type: "authenticated",
    resource_type: resourceTypeFor(mimeType),
    invalidate: true,
  });
}

async function fetchFromCloudinary(url: string, key: string) {
  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error("[storage] Could not reach Cloudinary:", key, err);
    return null;
  }

  if (!upstream.ok || !upstream.body) {
    console.error(
      `[storage] Cloudinary returned ${upstream.status} for ${key}: ` +
        (upstream.headers.get("x-cld-error") ?? "no x-cld-error header"),
    );
    return null;
  }
  return upstream;
}

export async function streamPrivateImage(key: string): Promise<Response> {
  const url = cloudinary.url(key, {
    type: "authenticated",
    resource_type: "image",
    sign_url: true,
    secure: true,
  });

  const upstream = await fetchFromCloudinary(url, key);
  if (!upstream) return new Response("File not available", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function streamPrivateFile(
  key: string,
  opts: { mimeType: string; fileName?: string; download?: boolean },
): Promise<Response> {
  const url = cloudinary.url(key, {
    type: "authenticated",
    resource_type: resourceTypeFor(opts.mimeType),
    sign_url: true,
    secure: true,
  });

  const upstream = await fetchFromCloudinary(url, key);
  if (!upstream) return new Response("File not available", { status: 404 });

  const safeName = (opts.fileName ?? "document").replace(/[^\w.\- ()]+/g, "_");

  return new Response(upstream.body, {
    headers: {
      "Content-Type": opts.mimeType,
      "Content-Disposition": `${opts.download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function getRecordKey(
  userId: string,
  kind: RecordKind,
): Promise<string | null> {
  switch (kind) {
    case "signature":
      return (
        (
          await prisma.signatoryDetail.findUnique({
            where: { userId },
            select: { signatureKey: true },
          })
        )?.signatureKey ?? null
      );
    case "photo":
      return (
        (
          await prisma.staffProfile.findUnique({
            where: { userId },
            select: { photoKey: true },
          })
        )?.photoKey ?? null
      );
  }
}
