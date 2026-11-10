import "server-only";
import type { DetailStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 
import { maskLast4 } from "@/lib/crypto";
import {
  DOCUMENT_LABELS,
  REQUIRED_DOCUMENT_TYPES,
} from "@/lib/staff-records/documents";

export type SectionState = "MISSING" | "INCOMPLETE" | "ADDED" | DetailStatus;
export type QueueFilter = "all" | "review" | "incomplete" | "rejected";
export const QUEUE_FILTERS: readonly QueueFilter[] = [
  "all",
  "review",
  "incomplete",
  "rejected",
];

export type QueueRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
  department: string | null;
  sections: {
    profile: SectionState;
    contacts: SectionState;
    documents: SectionState;
    payroll: SectionState;
    signatory: SectionState;
  };
  pending: number; 
  rejected: number;
  missing: number; 
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function getReviewQueue({
  q,
  filter,
}: {
  q: string;
  filter: QueueFilter;
}) {
  const users = await prisma.user.findMany({
    where: {
      deactivatedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 300,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      department: { select: { name: true } },
      staffProfile: { select: { status: true } },
      payroll: { select: { status: true } },
      signatory: { select: { status: true } },
      staffDocuments: { select: { type: true, status: true } },
      _count: { select: { emergencyContacts: true } },
    },
  });

  const all = users.map((u): QueueRow => {
    const docs = u.staffDocuments;
    const missingRequired = REQUIRED_DOCUMENT_TYPES.filter(
      (t) => !docs.some((d) => d.type === t),
    ).length;
    const docPending = docs.filter((d) => d.status === "PENDING").length;
    const docRejected = docs.filter((d) => d.status === "REJECTED").length;

    const singles = [
      u.staffProfile?.status,
      u.payroll?.status,
      u.signatory?.status,
    ];
    const pending = singles.filter((s) => s === "PENDING").length + docPending;
    const rejected =
      singles.filter((s) => s === "REJECTED").length + docRejected;
    const missing =
      [u.staffProfile, u.payroll, u.signatory].filter((x) => !x).length +
      (u._count.emergencyContacts === 0 ? 1 : 0) +
      missingRequired;

    const documents: SectionState =
      docRejected > 0
        ? "REJECTED"
        : docPending > 0
          ? "PENDING"
          : docs.length === 0
            ? "MISSING"
            : missingRequired > 0
              ? "INCOMPLETE"
              : "VERIFIED";

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      department: u.department?.name ?? null,
      sections: {
        profile: u.staffProfile?.status ?? "MISSING",
        contacts: u._count.emergencyContacts > 0 ? "ADDED" : "MISSING",
        documents,
        payroll: u.payroll?.status ?? "MISSING",
        signatory: u.signatory?.status ?? "MISSING",
      },
      pending,
      rejected,
      missing,
    };
  });

  const stats = {
    staff: all.length,
    needsReview: all.filter((r) => r.pending > 0).length,
    pendingItems: all.reduce((n, r) => n + r.pending, 0),
    rejected: all.filter((r) => r.rejected > 0).length,
    incomplete: all.filter((r) => r.missing > 0).length,
  };

  const rows = all
    .filter((r) =>
      filter === "review"
        ? r.pending > 0
        : filter === "rejected"
          ? r.rejected > 0
          : filter === "incomplete"
            ? r.missing > 0
            : true,
    )
    .sort(
      (a, b) =>
        b.pending - a.pending ||
        b.rejected - a.rejected ||
        a.name.localeCompare(b.name),
    );

  return { rows, stats };
}
export type ReviewQueueData = Awaited<ReturnType<typeof getReviewQueue>>;

function describeAccess(field: string) {
  if (field === "payroll.accountNumber") return "Account number revealed";
  if (field === "signatory.signature") return "Signature viewed";
  if (field.startsWith("document.")) {
    const type = field.slice("document.".length).toUpperCase();
    const label = (DOCUMENT_LABELS as Record<string, string>)[type];
    return `${label ?? "Document"} viewed`;
  }
  return field;
}

export async function getStaffRecordsForReview(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      deactivatedAt: true,
      department: { select: { name: true } },
    },
  });
  if (!user) return null;

  const [profile, contacts, payroll, signatory, documents, logs] =
    await Promise.all([
      prisma.staffProfile.findUnique({ where: { userId } }),
      prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      }),
      prisma.payrollDetail.findUnique({ where: { userId } }),
      prisma.signatoryDetail.findUnique({ where: { userId } }),
      prisma.staffDocument.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sensitiveAccessLog.findMany({
        where: { targetUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      department: user.department?.name ?? null,
      deactivated: Boolean(user.deactivatedAt),
    },
    profile: profile
      ? {
          preferredName: profile.preferredName,
          phone: profile.phone,
          altPhone: profile.altPhone,
          personalEmail: profile.personalEmail,
          addressLine: profile.addressLine,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          dateOfBirth: profile.dateOfBirth ? day(profile.dateOfBirth) : null,
          gender: profile.gender,
          maritalStatus: profile.maritalStatus,
          nationality: profile.nationality,
          stateOfOrigin: profile.stateOfOrigin,
          status: profile.status,
          reviewNote: profile.reviewNote,
          version: profile.updatedAt.toISOString(),
        }
      : null,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      altPhone: c.altPhone,
      address: c.address,
      isPrimary: c.isPrimary,
    })),
    payroll: payroll
      ? {
          bankName: payroll.bankName,
          accountName: payroll.accountName,
          accountNumberMasked: maskLast4(payroll.accountLast4),
          status: payroll.status,
          reviewNote: payroll.reviewNote,
          version: payroll.updatedAt.toISOString(),
        }
      : null,
    signatory: signatory
      ? {
          signatoryName: signatory.signatoryName,
          title: signatory.title,
          status: signatory.status,
          reviewNote: signatory.reviewNote,
          version: signatory.updatedAt.toISOString(),
        }
      : null,
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      status: d.status,
      reviewNote: d.reviewNote,
      createdAt: d.createdAt.toISOString(),
      version: d.updatedAt.toISOString(),
    })),
    access: logs.map((l) => ({
      id: l.id,
      what: describeAccess(l.field),
      by: actorName.get(l.actorId) ?? "Former user",
      at: l.createdAt.toISOString(),
    })),
  };
}
export type StaffReviewData = NonNullable<
  Awaited<ReturnType<typeof getStaffRecordsForReview>>
>;
