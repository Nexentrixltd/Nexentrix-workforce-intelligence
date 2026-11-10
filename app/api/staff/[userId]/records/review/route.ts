import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireApiRole } from "@/lib/auth/session"; 
import { prisma } from "@/lib/prisma"; 
import { notify } from "@/lib/notifications"; 
import { DOCUMENT_LABELS } from "@/lib/staff-records/documents";
import {
  badRequest,
  notFound,
  readJson,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";

export const runtime = "nodejs";

const schema = z
  .object({
    type: z.enum(["profile", "payroll", "signatory", "document"]),
    id: z.string().trim().min(1).max(60).optional(),
    decision: z.enum(["VERIFIED", "REJECTED"]),
    note: z.string().trim().max(500).optional(),
    version: z.string().datetime(),
  })
  .refine((d) => d.decision !== "REJECTED" || (d.note?.length ?? 0) >= 3, {
    path: ["note"],
    message: "Tell the staff member what to fix",
  })
  .refine((d) => d.type !== "document" || Boolean(d.id), {
    path: ["id"],
    message: "Missing document",
  });

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  await requireApiRole(RECORD_REVIEWERS);
  const actor = await getSessionUser();
  if (!actor) return unauthorized();

  const { userId } = await params;

  if (userId === actor.id) {
    return badRequest(
      "You can’t review your own records. Ask another HR or admin user.",
      403,
    );
  }

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const seen = new Date(input.version);
  const review = {
    status: input.decision,
    reviewNote: input.decision === "REJECTED" ? input.note! : null,
    reviewedById: actor.id,
    reviewedAt: new Date(),
  };

  let count = 0;
  let label = "";
  let href = "";

  if (input.type === "profile") {
    count = (
      await prisma.staffProfile.updateMany({
        where: { userId, updatedAt: seen },
        data: review,
      })
    ).count;
    label = "personal details";
    href = "/settings/records/personal";
  } else if (input.type === "payroll") {
    count = (
      await prisma.payrollDetail.updateMany({
        where: { userId, updatedAt: seen },
        data: review,
      })
    ).count;
    label = "payroll details";
    href = "/settings/records/payroll";
  } else if (input.type === "signatory") {
    count = (
      await prisma.signatoryDetail.updateMany({
        where: { userId, updatedAt: seen },
        data: review,
      })
    ).count;
    label = "signatory details";
    href = "/settings/records/signatory";
  } else {
    const doc = await prisma.staffDocument.findFirst({
      where: { id: input.id, userId },
      select: { type: true },
    });
    if (!doc) return notFound();
    count = (
      await prisma.staffDocument.updateMany({
        where: { id: input.id!, userId, updatedAt: seen },
        data: review,
      })
    ).count;
    label = DOCUMENT_LABELS[doc.type].toLowerCase();
    href = "/settings/records/documents";
  }

  if (count === 0) {
    return badRequest(
      "This record changed while you were reviewing it. Reload the page to see the latest version.",
      409,
    );
  }

  await notify({
    userId,
    type: "staff-record-reviewed",
    title:
      input.decision === "VERIFIED"
        ? `${capitalise(label)} verified`
        : `${capitalise(label)} needs changes`,
    body:
      input.decision === "REJECTED"
        ? input.note
        : "HR has verified this record.",
    href,
  });

  return NextResponse.json({ ok: true });
}
