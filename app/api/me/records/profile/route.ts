import { NextResponse } from "next/server";
import { DetailStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 
import { staffProfileSchema } from "@/lib/validations/staff-records";
import {
  PENDING_RESET,
  badRequest,
  changedFields,
  discardOldKey,
  fieldError,
  getSelf,
  notifyReviewers,
  readJson,
  resolveKey,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

const SELECT = {
  preferredName: true,
  phone: true,
  altPhone: true,
  personalEmail: true,
  addressLine: true,
  city: true,
  state: true,
  country: true,
  dateOfBirth: true,
  gender: true,
  maritalStatus: true,
  nationality: true,
  stateOfOrigin: true,
  photoKey: true,
  status: true,
  reviewNote: true,
  updatedAt: true,
} as const;

const toDto = (r: { photoKey: string | null }) => {
  const { photoKey, ...rest } = r as typeof r & Record<string, unknown>;
  return { ...rest, hasPhoto: Boolean(photoKey) };
};

const COMPARED = [
  "preferredName",
  "phone",
  "altPhone",
  "personalEmail",
  "addressLine",
  "city",
  "state",
  "country",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "nationality",
  "stateOfOrigin",
] as const;

export async function GET() {
  const user = await getSelf();
  if (!user) return unauthorized();

  const record = await prisma.staffProfile.findUnique({
    where: { userId: user.id },
    select: SELECT,
  });
  return NextResponse.json({ record: record ? toDto(record) : null });
}

export async function PUT(req: Request) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = staffProfileSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const existing = await prisma.staffProfile.findUnique({
    where: { userId: user.id },
  });

  const photo = resolveKey(
    user.id,
    "photo",
    input.photoKey,
    existing?.photoKey ?? null,
  );
  if (!photo.ok) return fieldError("photoKey", "Invalid file reference");

  const changed =
    !existing || photo.changed || changedFields(existing, input, [...COMPARED]);

  if (existing && !changed) {
    const current = await prisma.staffProfile.findUniqueOrThrow({
      where: { userId: user.id },
      select: SELECT,
    });
    return NextResponse.json({ record: toDto(current) });
  }

  const data = {
    preferredName: input.preferredName ?? null,
    phone: input.phone,
    altPhone: input.altPhone ?? null,
    personalEmail: input.personalEmail ?? null,
    addressLine: input.addressLine,
    city: input.city,
    state: input.state,
    country: input.country,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender ?? null,
    maritalStatus: input.maritalStatus ?? null,
    nationality: input.nationality,
    stateOfOrigin: input.stateOfOrigin ?? null,
    photoKey: photo.key,
  };

  const record = existing
    ? await prisma.staffProfile.update({
        where: { userId: user.id },
        data: { ...data, ...PENDING_RESET },
        select: SELECT,
      })
    : await prisma.staffProfile.create({
        data: { userId: user.id, ...data },
        select: SELECT,
      });

  if (photo.changed) await discardOldKey(existing?.photoKey);
  if (!existing || existing.status !== DetailStatus.PENDING) {
    await notifyReviewers(user.id, "profile details");
  }

  return NextResponse.json({ record: toDto(record) });
}
