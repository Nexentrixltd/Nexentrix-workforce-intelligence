import "server-only";
import type { DetailStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; // adjust path
import { maskLast4 } from "@/lib/crypto";

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function getProfileRecord(userId: string) {
  const r = await prisma.staffProfile.findUnique({
    where: { userId },
    select: {
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
      status: true,
      reviewNote: true,
    },
  });
  if (!r) return null;
  return { ...r, dateOfBirth: r.dateOfBirth ? day(r.dateOfBirth) : null };
}
export type ProfileDto = NonNullable<
  Awaited<ReturnType<typeof getProfileRecord>>
>;

export async function getEmergencyContacts(userId: string) {
  return prisma.emergencyContact.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      relationship: true,
      phone: true,
      altPhone: true,
      address: true,
      isPrimary: true,
    },
  });
}
export type ContactDto = Awaited<
  ReturnType<typeof getEmergencyContacts>
>[number];

export async function getPayrollRecord(userId: string) {
  const r = await prisma.payrollDetail.findUnique({ where: { userId } });
  if (!r) return null;
  return {
    bankName: r.bankName,
    accountName: r.accountName,
    accountNumberMasked: maskLast4(r.accountLast4),
    status: r.status,
    reviewNote: r.reviewNote,
  };
}
export type PayrollDto = NonNullable<
  Awaited<ReturnType<typeof getPayrollRecord>>
>;

export async function getSignatoryRecord(userId: string) {
  const r = await prisma.signatoryDetail.findUnique({ where: { userId } });
  if (!r) return null;
  return {
    signatoryName: r.signatoryName,
    title: r.title,
    hasSignature: Boolean(r.signatureKey),
    status: r.status,
    reviewNote: r.reviewNote,
  };
}
export type SignatoryDto = NonNullable<
  Awaited<ReturnType<typeof getSignatoryRecord>>
>;

export async function getDocuments(userId: string) {
  const rows = await prisma.staffDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      reviewNote: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
export type DocumentDto = Awaited<ReturnType<typeof getDocuments>>[number];

export async function getRecordsOverview(userId: string) {
  const statusSelect = { status: true, reviewNote: true } as const;
  const [profile, contactCount, payroll, signatory, docs] = await Promise.all([
    prisma.staffProfile.findUnique({ where: { userId }, select: statusSelect }),
    prisma.emergencyContact.count({ where: { userId } }),
    prisma.payrollDetail.findUnique({
      where: { userId },
      select: statusSelect,
    }),
    prisma.signatoryDetail.findUnique({
      where: { userId },
      select: statusSelect,
    }),
    prisma.staffDocument?.findMany({
      where: { userId },
      select: { type: true, status: true, reviewNote: true },
    }),
  ]);

  const rejected = docs.find((d) => d.status === "REJECTED");
  const docStatus: DetailStatus | null =
    docs.length === 0
      ? null
      : rejected
        ? "REJECTED"
        : docs.some((d) => d.status === "PENDING")
          ? "PENDING"
          : "VERIFIED";

  const documents = {
    count: docs.length,
    status: docStatus,
    note: rejected?.reviewNote ?? null,
    hasPassportPhoto: docs.some((d) => d.type === "PASSPORT_PHOTO"),
    hasAppointmentLetter: docs.some((d) => d.type === "APPOINTMENT_LETTER"),
  };

  return { profile, contactCount, payroll, signatory, documents };
}
