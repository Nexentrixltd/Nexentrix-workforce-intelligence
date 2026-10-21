import "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";

export { cloudinary };

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_FORMATS = ["jpg", "jpeg", "png", "webp"];
export function avatarPublicId(userId: string) {
  return `avatars/${userId}`;
}

export function getCloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) return null;
  return { cloudName: cloud_name, apiKey: api_key, apiSecret: api_secret };
}
