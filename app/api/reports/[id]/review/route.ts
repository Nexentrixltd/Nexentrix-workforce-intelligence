import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { notify, reportsHref } from "@/lib/notifications";
import { canReviewReport, ReportActor, visibleReportsWhere } from "@/lib/reports/reports-access";

const schema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.decision === "APPROVED" || (d.note && d.note.length >= 5), {
    message: "Tell them what to fix (at least 5 characters)",
    path: ["note"],
  });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN", "TEAM_LEAD"]);
  if (!auth.ok) return auth.response;

  const actor: ReportActor = {
    userId: auth.user.id,
    role: auth.user.role,
    departmentId: auth.user.departmentId,
  };

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  const report = await prisma.report.findFirst({
    where: { AND: [{ id }, visibleReportsWhere(actor)] },
    select: {
      id: true,
      status: true,
      userId: true,
      departmentId: true,
      reportDate: true,
      user: { select: { role: true } },
      project: { select: { name: true, leadId: true } },
    },
  });
  if (!report)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canReviewReport(actor, report))
    return NextResponse.json(
      { error: "You cannot review this report" },
      { status: 403 },
    );

  if (report.status !== "SUBMITTED")
    return NextResponse.json(
      { error: "This report has already been reviewed" },
      { status: 409 },
    );

  const result = await prisma.report.updateMany({
    where: { id, status: "SUBMITTED" },
    data: {
      status: d.decision,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
      reviewNote: d.note || null,
    },
  });
  if (result.count === 0)
    return NextResponse.json(
      { error: "This report has already been reviewed" },
      { status: 409 },
    );

  const date = report.reportDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  await notify({
    userId: report.userId,
    type: d.decision === "APPROVED" ? "REPORT_APPROVED" : "REPORT_REJECTED",
    title:
      d.decision === "APPROVED"
        ? `Your report for ${date} was approved`
        : `Your report for ${date} needs changes`,
    body: d.note || report.project?.name || "General work",
    href: reportsHref(report.user.role),
  });

  return NextResponse.json({ status: d.decision });
}
