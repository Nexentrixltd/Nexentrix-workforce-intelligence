import { NextResponse } from "next/server";
import { DetailStatus, type PayrollDetail } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 
import { encryptField, fieldAad, last4, maskLast4 } from "@/lib/crypto";
import { payrollUpdateSchema } from "@/lib/validations/staff-records";
import {
  PENDING_RESET,
  badRequest,
  changedFields,
  fieldError,
  getSelf,
  notifyReviewers,
  readJson,
  safeDecrypt,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

const toDto = (r: PayrollDetail) => ({
  bankName: r.bankName,
  accountName: r.accountName,
  accountNumberMasked: maskLast4(r.accountLast4),
  status: r.status,
  reviewNote: r.reviewNote,
  updatedAt: r.updatedAt,
});

export async function GET() {
  const user = await getSelf();
  if (!user) return unauthorized();

  const record = await prisma.payrollDetail.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({ record: record ? toDto(record) : null });
}

export async function PUT(req: Request) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = payrollUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const existing = await prisma.payrollDetail.findUnique({
    where: { userId: user.id },
  });

  const accountNumber = input.accountNumber || undefined;

  if (!existing && !accountNumber) {
    return fieldError("accountNumber", "Account number is required");
  }

  const aad = fieldAad(user.id, "payroll.accountNumber");

  const changed =
    !existing ||
    changedFields(existing, input, ["bankName", "accountName"]) ||
    (accountNumber !== undefined &&
      safeDecrypt(existing.accountNumberEnc, aad) !== accountNumber);

  if (existing && !changed) {
    return NextResponse.json({ record: toDto(existing) });
  }

  const record = existing
    ? await prisma.payrollDetail.update({
        where: { userId: user.id },
        data: {
          bankName: input.bankName,
          accountName: input.accountName,
          ...(accountNumber
            ? {
                accountNumberEnc: encryptField(accountNumber, aad),
                accountLast4: last4(accountNumber),
              }
            : {}),
          ...PENDING_RESET,
        },
      })
    : await prisma.payrollDetail.create({
        data: {
          userId: user.id,
          bankName: input.bankName,
          accountName: input.accountName,
          accountNumberEnc: encryptField(accountNumber!, aad),
          accountLast4: last4(accountNumber!),
        },
      });

  if (!existing || existing.status !== DetailStatus.PENDING) {
    await notifyReviewers(user.id, "payroll details");
  }

  return NextResponse.json({ record: toDto(record) });
}