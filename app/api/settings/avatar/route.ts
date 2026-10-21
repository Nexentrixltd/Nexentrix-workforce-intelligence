import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { ALLOWED_AVATAR_FORMATS, avatarPublicId, cloudinary, getCloudinaryConfig, MAX_AVATAR_BYTES } from "@/lib/avatar";

export async function POST() {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  if (!getCloudinaryConfig())
    return NextResponse.json(
      { error: "Photo uploads are not set up yet." },
      { status: 500 },
    );

  const userId = auth.user.id;
  const publicId = avatarPublicId(userId);

  let resource: { format: string; bytes: number; secure_url: string };
  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: "image",
    });
  } catch {
    return NextResponse.json(
      { error: "We could not find your uploaded photo. Please try again." },
      { status: 400 },
    );
  }

  const badFormat = !ALLOWED_AVATAR_FORMATS.includes(resource.format);
  const tooBig = resource.bytes > MAX_AVATAR_BYTES;
  if (badFormat || tooBig) {
    await cloudinary.uploader
      .destroy(publicId, { invalidate: true })
      .catch(() => null);
    await prisma.user.update({ where: { id: userId }, data: { image: null } });
    return NextResponse.json(
      {
        error: tooBig
          ? "Your photo must be smaller than 5 MB. Please upload it again."
          : "Choose a JPG, PNG or WebP image.",
      },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { image: resource.secure_url },
  });

  return NextResponse.json({ image: resource.secure_url });
}

export async function DELETE() {
  const auth = await requireApiRole([
    "ADMIN",
    "HR",
    "TEAM_LEAD",
    "STAFF",
    "EXECUTIVE",
  ]);
  if (!auth.ok) return auth.response;

  if (getCloudinaryConfig())
    await cloudinary.uploader
      .destroy(avatarPublicId(auth.user.id), { invalidate: true })
      .catch(() => null);

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { image: null },
  });

  return NextResponse.json({ image: null });
}
