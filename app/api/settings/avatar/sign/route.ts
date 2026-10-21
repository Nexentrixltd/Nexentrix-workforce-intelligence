import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/session";
import { avatarPublicId, cloudinary, getCloudinaryConfig } from "@/lib/avatar";

export async function POST() {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  const cfg = getCloudinaryConfig();
  if (!cfg)
    return NextResponse.json(
      { error: "Photo uploads are not set up yet." },
      { status: 500 },
    );

  const timestamp = Math.round(Date.now() / 1000);
  const publicId = avatarPublicId(auth.user.id);

  const signature = cloudinary.utils.api_sign_request(
    {
      allowed_formats: "jpg,png,webp",
      invalidate: true,
      overwrite: true,
      public_id: publicId,
      timestamp,
    },
    cfg.apiSecret,
  );

  return NextResponse.json({
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    signature,
    publicId,
  });
}
