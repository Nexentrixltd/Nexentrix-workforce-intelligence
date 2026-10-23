import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  notify,
  projectHref,
  reportsHref,
  type NotificationInput,
} from "@/lib/notifications";
import {
  visibleReportsWhere,
  type ReportActor,
} from "@/lib/reports/reports-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const WORKING_WEEKDAYS = new Set([1, 2, 3, 4, 5]);
const SUBMIT_WINDOW_DAYS = 7;
const DEADLINE_NOTICE_DAYS = [7, 1, 0];
const IN_PROGRESS = ["PLANNING", "ACTIVE", "ON_HOLD"] as const;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const addDays = (key: string, n: number) => {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
};
const weekday = (key: string) => toDate(key).getUTCDay();
const daysBetween = (fromKey: string, toKey: string) =>
  Math.round(
    (toDate(toKey).getTime() - toDate(fromKey).getTime()) / 86_400_000,
  );

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = dayKey(new Date());
  const startOfToday = toDate(today);
  const out: NotificationInput[] = [];

  async function alreadySentToday(type: string, userIds: string[]) {
    if (userIds.length === 0) return new Set<string>();
    const rows = await prisma.notification.findMany({
      where: {
        type,
        userId: { in: userIds },
        createdAt: { gte: startOfToday },
      },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  const isWorkingDay = WORKING_WEEKDAYS.has(weekday(today));

  if (isWorkingDay) {
    const staff = await prisma.user.findMany({
      where: { role: "STAFF", deactivatedAt: null, reminderEnabled: true },
      select: { id: true },
    });
    const staffIds = staff.map((s) => s.id);

    const oldestOpenDay = addDays(today, -(SUBMIT_WINDOW_DAYS - 1));
    const reports = await prisma.report.findMany({
      where: {
        userId: { in: staffIds },
        reportDate: { gte: toDate(oldestOpenDay), lte: startOfToday },
      },
      select: { userId: true, reportDate: true },
    });

    const submittedDays = new Map<string, Set<string>>();
    for (const r of reports) {
      const set = submittedDays.get(r.userId) ?? new Set<string>();
      set.add(dayKey(r.reportDate));
      submittedDays.set(r.userId, set);
    }

    const sentReminder = await alreadySentToday(
      "DAILY_REPORT_REMINDER",
      staffIds,
    );
    const sentClosing = await alreadySentToday(
      "REPORT_WINDOW_CLOSING",
      staffIds,
    );

    for (const id of staffIds) {
      const days = submittedDays.get(id) ?? new Set<string>();

      if (!days.has(today) && !sentReminder.has(id))
        out.push({
          userId: id,
          type: "DAILY_REPORT_REMINDER",
          title: "Submit today's report",
          body: "You have not submitted your report for today yet.",
          href: reportsHref("STAFF"),
        });

      if (
        WORKING_WEEKDAYS.has(weekday(oldestOpenDay)) &&
        !days.has(oldestOpenDay) &&
        !sentClosing.has(id)
      )
        out.push({
          userId: id,
          type: "REPORT_WINDOW_CLOSING",
          title: "Last chance to submit a report",
          body: `Your report for ${oldestOpenDay} can only be submitted until the end of today.`,
          href: reportsHref("STAFF"),
        });
    }

    const leads = await prisma.user.findMany({
      where: { role: "TEAM_LEAD", deactivatedAt: null },
      select: { id: true, role: true, departmentId: true },
    });
    const sentDigest = await alreadySentToday(
      "PENDING_REVIEWS_DIGEST",
      leads.map((l) => l.id),
    );

    for (const lead of leads) {
      if (sentDigest.has(lead.id)) continue;

      const actor: ReportActor = {
        userId: lead.id,
        role: lead.role,
        departmentId: lead.departmentId,
      };
      const waiting = await prisma.report.count({
        where: {
          AND: [visibleReportsWhere(actor, false), { status: "SUBMITTED" }],
        },
      });

      if (waiting > 0)
        out.push({
          userId: lead.id,
          type: "PENDING_REVIEWS_DIGEST",
          title: `${waiting} ${waiting === 1 ? "report is" : "reports are"} waiting for your review`,
          body: null,
          href: reportsHref("TEAM_LEAD"),
        });
    }
  }

  const horizon = addDays(today, Math.max(...DEADLINE_NOTICE_DAYS));
  const projects = await prisma.project.findMany({
    where: {
      status: { in: [...IN_PROGRESS] },
      endDate: { gte: startOfToday, lte: toDate(horizon) },
    },
    select: {
      id: true,
      name: true,
      endDate: true,
      leadId: true,
      members: { select: { userId: true } },
    },
  });

  for (const project of projects) {
    if (!project.endDate) continue;
    const daysLeft = daysBetween(today, dayKey(project.endDate));
    if (!DEADLINE_NOTICE_DAYS.includes(daysLeft)) continue;

    const wanted = [
      ...new Set([project.leadId, ...project.members.map((m) => m.userId)]),
    ];
    const people = await prisma.user.findMany({
      where: { id: { in: wanted }, deactivatedAt: null },
      select: { id: true, role: true },
    });

    const title =
      daysLeft === 0
        ? `${project.name} is due today`
        : daysLeft === 1
          ? `${project.name} is due tomorrow`
          : `${project.name} is due in ${daysLeft} days`;

    for (const person of people)
      out.push({
        userId: person.id,
        type: "PROJECT_DEADLINE",
        title,
        body: `End date: ${dayKey(project.endDate)}.`,
        href: projectHref(person.role, project.id),
      });
  }

  if (out.length > 0) await notify(out);

  const counts: Record<string, number> = {};
  for (const n of out) counts[n.type] = (counts[n.type] ?? 0) + 1;

  return NextResponse.json({
    date: today,
    workingDay: isWorkingDay,
    queued: counts,
  });
}
