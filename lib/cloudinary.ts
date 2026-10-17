import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_FORMATS = "jpg,png,webp";

export const reportFolder = (userId: string) => `nexentrix/reports/${userId}`;

export function createUploadSignature(userId: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = reportFolder(userId);
  const params = {
    timestamp,
    folder,
    type: "authenticated",
    allowed_formats: ALLOWED_FORMATS,
  };
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!,
  );
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    type: "authenticated",
    allowedFormats: ALLOWED_FORMATS,
    signature,
  };
}

export async function getUploadedImage(publicId: string) {
  const r = await cloudinary.api.resource(publicId, {
    type: "authenticated",
    resource_type: "image",
  });
  return {
    publicId: r.public_id as string,
    format: r.format as string,
    bytes: r.bytes as number,
    width: r.width as number,
    height: r.height as number,
  };
}

export async function deleteReportImages(publicIds: string[]) {
  await Promise.allSettled(
    publicIds.map((id) =>
      cloudinary.uploader.destroy(id, {
        type: "authenticated",
        resource_type: "image",
      }),
    ),
  );
}

// Resized on Cloudinary's CDN, served as WebP/AVIF when the browser supports it
export function signedImageUrl(publicId: string, width: number) {
  return cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    resource_type: "image",
    transformation: [
      { width, crop: "limit", fetch_format: "auto", quality: "auto" },
    ],
  });
}
