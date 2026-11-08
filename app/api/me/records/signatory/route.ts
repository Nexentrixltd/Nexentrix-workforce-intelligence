import { NextResponse } from "next/server";
import { DetailStatus, type SignatoryDetail } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 
import { signatorySchema } from "@/lib/validations/staff-records";
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

const toDto = (r: SignatoryDetail) => ({
  signatoryName: r.signatoryName,
  title: r.title,
  hasSignature: Boolean(r.signatureKey),
  status: r.status,
  reviewNote: r.reviewNote,
  updatedAt: r.updatedAt,
});

export async function GET() {
  const user = await getSelf();
  if (!user) return unauthorized();

  const record = await prisma.signatoryDetail.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({ record: record ? toDto(record) : null });
}

export async function PUT(req: Request) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = signatorySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const existing = await prisma.signatoryDetail.findUnique({
    where: { userId: user.id },
  });

  const sig = resolveKey(
    user.id,
    "signature",
    input.signatureKey,
    existing?.signatureKey ?? null,
  );
  if (!sig.ok) return fieldError("signatureKey", "Invalid file reference");
  if (!sig.key)
    return fieldError("signatureKey", "A signature image is required");

  const changed =
    !existing ||
    sig.changed ||
    changedFields(existing, input, ["signatoryName", "title"]);

  if (existing && !changed) {
    return NextResponse.json({ record: toDto(existing) });
  }

  const data = {
    signatoryName: input.signatoryName,
    title: input.title ?? null,
    signatureKey: sig.key,
  };

  const record = existing
    ? await prisma.signatoryDetail.update({
        where: { userId: user.id },
        data: { ...data, ...PENDING_RESET },
      })
    : await prisma.signatoryDetail.create({
        data: { userId: user.id, ...data },
      });

  if (sig.changed) await discardOldKey(existing?.signatureKey);
  if (!existing || existing.status !== DetailStatus.PENDING) {
    await notifyReviewers(user.id, "signatory details");
  }

  return NextResponse.json({ record: toDto(record) });
}
