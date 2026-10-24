"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  FileText,
  Hourglass,
  Plus,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";

const ROUTES = {
  newReport: (date: string) => `/staff/reports/new?date=${date}`,
  reports: "/staff/reports",
  report: (id: string) => `/staff/reports/${id}`,
  notifications: "/staff/notifications",
};

const SUBMIT_WINDOW_DAYS = 7;
const WORKING_WEEKDAYS = new Set([1, 2, 3, 4, 5]);
const ALLOCATION_PER_DAY = 20;
const FULL_WEEK_DAYS = 5;
const DEADLINE_WARN_DAYS = 14;
const DEADLINE_ATTENTION_DAYS = 7;
const MAX_REJECTED_SHOWN = 3;

type ReportStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type ReportItem = {
  id: string;
  reportDate: string;
  status: ReportStatus;
  hoursSpent: number;
  tasksInProgress: string | null;
  tomorrowPriority: string | null;
  reviewNote: string | null;
  reviewedBy: { name: string } | null;
  project: { id: string; name: string; code: string } | null;
};

type ReportsResponse = {
  items: ReportItem[];
  total: number;
  pageSize: number;
  counts: Record<ReportStatus, number>;
};

type SubmittedEntry = { date: string; projectId: string | null };

type MyProject = {
  id: string;
  name: string;
  code: string;
  status: string;
  isLead: boolean;
  leadName: string | null;
  endDate: string | null;
  allocation: number;
  href: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDayKeys(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    toDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)),
  );
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDayKey(key: string) {
  return parseDayKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isWorkingDay(key: string) {
  return WORKING_WEEKDAYS.has(parseDayKey(key).getDay());
}

function reportDayKey(r: ReportItem) {
  return r.reportDate.slice(0, 10);
}

function allocationToDays(allocation: number) {
  const days = allocation / ALLOCATION_PER_DAY;
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

function formatHours(h: number) {
  return `${Math.round(h * 10) / 10}h`;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function daysBetween(fromKey: string, toKey: string) {
  return Math.round(
    (parseDayKey(toKey).getTime() - parseDayKey(fromKey).getTime()) / 86400000,
  );
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
};

function deadlineInfo(endDate: string | null, todayKey: string) {
  if (!endDate) return null;
  const n = daysBetween(todayKey, endDate);
  if (n < 0)
    return {
      text: `Overdue by ${-n} ${-n === 1 ? "day" : "days"}`,
      className: "text-red-600 dark:text-red-400",
    };
  if (n === 0)
    return { text: "Ends today", className: "text-amber-600 dark:text-amber-400" };
  if (n === 1)
    return { text: "Ends tomorrow", className: "text-amber-600 dark:text-amber-400" };
  if (n <= DEADLINE_WARN_DAYS)
    return {
      text: `Ends in ${n} days`,
      className: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `Ends ${parseDayKey(endDate).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`,
    className: "text-muted-foreground",
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

type Tone = "default" | "blue" | "violet" | "success" | "warn" | "danger";

const TILE_TONES: Record<Tone, string> = {
  default: "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  blue: "bg-sky-500/12 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
  violet: "bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  success: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  danger: "bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
};

function IconTile({
  icon: IconCmp,
  tone = "default",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl"
        } ${TILE_TONES[tone]}`}
    >
      <IconCmp className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
    </div>
  );
}

const NOTIFICATION_STYLES: Record<string, { icon: LucideIcon; tone: Tone }> = {
  REPORT_SUBMITTED: { icon: FileText, tone: "default" },
  PENDING_REVIEWS_DIGEST: { icon: FileText, tone: "default" },
  REPORT_APPROVED: { icon: CircleCheck, tone: "success" },
  REPORT_REJECTED: { icon: CircleX, tone: "danger" },
  PROJECT_LEAD_ASSIGNED: { icon: Briefcase, tone: "default" },
  PROJECT_MEMBER_ADDED: { icon: Briefcase, tone: "default" },
  PROJECT_MEMBER_REMOVED: { icon: Briefcase, tone: "warn" },
  PROJECT_DEADLINE: { icon: CalendarClock, tone: "warn" },
  DAILY_REPORT_REMINDER: { icon: Clock, tone: "warn" },
  REPORT_WINDOW_CLOSING: { icon: TriangleAlert, tone: "danger" },
  PASSWORD_CHANGED: { icon: ShieldCheck, tone: "warn" },
  NEW_SIGN_IN: { icon: ShieldCheck, tone: "warn" },
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  SUBMITTED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function Panel({
  title,
  icon,
  iconTone = "default",
  hint,
  count,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconTone?: Tone;
  hint?: string;
  count?: number;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="group overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm shadow-slate-950/2.5 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-950/4 dark:shadow-black/10">
      <header className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={icon} tone={iconTone} size="sm" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {title}
              {count ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {count}
                </span>
              ) : null}
            </h2>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-black/10 dark:bg-white/10" />
      ))}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{message}</p>;
}

function EmptyNote({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

function ReportRow({ report }: { report: ReportItem }) {
  const rejected = report.status === "REJECTED";
  return (
    <li className="py-0.5 first:pt-0 last:pb-0">
      <Link
        href={ROUTES.report(report.id)}
        className={`block rounded-xl px-3 py-3 transition-colors ${rejected
          ? "border-l-2 border-red-500 bg-red-500/10 hover:bg-red-500/15"
          : "hover:bg-muted/70 dark:hover:bg-white/4"
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {report.project?.name ?? "General work"}
            </p>
            <div className="mt-0.5 flex gap-3 text-sm text-muted-foreground">
              <span>{formatDayKey(reportDayKey(report))}</span>
              <span>{formatHours(report.hoursSpent)}</span>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {rejected && (
          <p className="mt-2 text-sm text-red-700 wrap-anywhere dark:text-red-300">
            {report.reviewNote ? report.reviewNote : "No reason was given."}
            {report.reviewedBy ? ` (${report.reviewedBy.name})` : ""}
          </p>
        )}
      </Link>
    </li>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-text-primary";

  return (
    <div className="flex min-h-31 bg-muted/50 items-start justify-between gap-3 rounded-2xl border border-border/75 bg-background px-5 py-5 shadow-sm shadow-slate-950/2 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md dark:shadow-black/10">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${valueColor}`}
        >
          {value}
        </p>
      </div>
      <IconTile icon={icon} tone={tone} />
    </div>
  );
}

type HeroState = "loading" | "error" | "done" | "due" | "off";

const HERO_STYLES: Record<
  HeroState,
  { box: string; iconWrap: string; Icon: LucideIcon | null }
> = {
  loading: { box: "border-border bg-muted", iconWrap: "", Icon: null },
  error: { box: "border-border bg-muted", iconWrap: "", Icon: null },
  done: {
    box: "border-emerald-500/30 bg-emerald-500/10",
    iconWrap:
      "bg-emerald-500/20 text-emerald-600 ring-emerald-500/10 dark:text-emerald-400",
    Icon: CircleCheck,
  },
  due: {
    box: "border-amber-500/40 bg-amber-500/10",
    iconWrap: "bg-amber-500/20 text-amber-600 ring-amber-500/10 dark:text-amber-400",
    Icon: Clock,
  },
  off: {
    box: "border-border bg-muted",
    iconWrap: "bg-primary/10 text-primary ring-primary/10",
    Icon: CalendarDays,
  },
};

const HERO_COPY: Record<"done" | "due" | "off", { title: string; text: string }> = {
  done: {
    title: "Today's report is submitted",
    text: "You can still add a report for another project you worked on today.",
  },
  due: {
    title: "Today's report isn't submitted yet",
    text: "It takes a few minutes. Submit before you finish for the day.",
  },
  off: {
    title: "No report is due today",
    text: "If you worked anyway, you can still submit one.",
  },
};

type AttentionItem = {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail?: string;
  href?: string;
  action?: string;
  days?: string[];
};

export default function StaffDashboardPage() {
  const user = useUserStore((s: any) => s.user);

  const dayKeys = lastNDayKeys(SUBMIT_WINDOW_DAYS);
  const todayKey = dayKeys[0];
  const fromKey = dayKeys[dayKeys.length - 1];

  const reportsQuery = useQuery({
    queryKey: ["staff", "reports", "recent", fromKey],
    queryFn: () =>
      getJson<ReportsResponse>(`/api/reports?scope=mine&from=${fromKey}`),
  });

  const submittedQuery = useQuery({
    queryKey: ["staff", "reports", "submitted"],
    queryFn: () => getJson<SubmittedEntry[]>("/api/reports/submitted"),
  });

  const projectsQuery = useQuery({
    queryKey: ["staff", "my-projects"],
    queryFn: () => getJson<MyProject[]>("/api/staff/my-projects"),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => getJson<NotificationsResponse>("/api/notifications"),
  });

  const reports = reportsQuery.data?.items ?? [];
  const counts = reportsQuery.data?.counts;
  const projects = projectsQuery.data ?? [];
  const unread = (notificationsQuery.data?.items ?? [])
    .filter((n) => n.readAt === null)
    .slice(0, 5);
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const submittedDays = new Set((submittedQuery.data ?? []).map((e) => e.date));
  const todaySubmitted = submittedDays.has(todayKey);
  const todayIsWorkingDay = isWorkingDay(todayKey);
  const missedDays = dayKeys.filter(
    (k) => k !== todayKey && isWorkingDay(k) && !submittedDays.has(k),
  );

  const sortedReports = [...reports].sort((a, b) => {
    if (a.status === "REJECTED" && b.status !== "REJECTED") return -1;
    if (b.status === "REJECTED" && a.status !== "REJECTED") return 1;
    return reportDayKey(b).localeCompare(reportDayKey(a));
  });

  const totalAllocation = projects.reduce((sum, p) => sum + p.allocation, 0);
  const totalDays = totalAllocation / ALLOCATION_PER_DAY;
  const overAllocated = totalDays > FULL_WEEK_DAYS;

  const truncated = (reportsQuery.data?.total ?? 0) > reports.length;
  const totalHours = reports.reduce((sum, r) => sum + r.hoursSpent, 0);
  const latest = reports[0];

  const attention: AttentionItem[] = [];

  for (const r of reports.filter((r) => r.status === "REJECTED").slice(0, MAX_REJECTED_SHOWN))
    attention.push({
      id: `rejected-${r.id}`,
      icon: CircleX,
      tone: "danger",
      title: `${r.project?.name ?? "General work"} (${formatDayKey(reportDayKey(r))}) was rejected`,
      detail: r.reviewNote?.trim() || "No reason was given.",
      href: ROUTES.report(r.id),
      action: "Open report",
    });

  if (submittedQuery.data && missedDays.length > 0)
    attention.push({
      id: "missing-reports",
      icon: CalendarX2,
      tone: "warn",
      title: `${missedDays.length} ${missedDays.length === 1 ? "report is" : "reports are"} missing from the last ${SUBMIT_WINDOW_DAYS} days`,
      detail: "A day can only be submitted while it is inside the 7-day window.",
      days: missedDays,
    });

  [...projects]
    .filter((p) => p.endDate && daysBetween(todayKey, p.endDate) <= DEADLINE_ATTENTION_DAYS)
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!))
    .forEach((p) => {
      const info = deadlineInfo(p.endDate, todayKey);
      attention.push({
        id: `deadline-${p.id}`,
        icon: CalendarClock,
        tone: daysBetween(todayKey, p.endDate!) < 0 ? "danger" : "warn",
        title: p.name,
        detail: info?.text,
        href: p.href,
        action: "Open project",
      });
    });

  if (overAllocated)
    attention.push({
      id: "over-allocated",
      icon: TriangleAlert,
      tone: "danger",
      title: `You are allocated ${Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1)} days a week`,
      detail: `That is more than a ${FULL_WEEK_DAYS}-day week. Talk to your team lead.`,
    });

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const statsLoading = reportsQuery.isLoading;

  const heroState: HeroState = submittedQuery.isLoading
    ? "loading"
    : submittedQuery.isError
      ? "error"
      : todaySubmitted
        ? "done"
        : todayIsWorkingDay
          ? "due"
          : "off";
  const hero = HERO_STYLES[heroState];
  const HeroIcon = hero.Icon;
  const heroReady = heroState === "done" || heroState === "due" || heroState === "off";

  return (
    <div className="mx-auto max-w-360 space-y-7 p-4 sm:p-6 lg:space-y-8 lg:p-8">
      <header className="">
        <h1 className="relative font-triakis text-4xl tracking-tight text-text-primary sm:text-5xl">
          Hello{user?.name ? `, ${String(user.name).split(" ")[0]}` : ""}
        </h1>
        <p
          className="relative mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          <CalendarDays className="h-4 w-4 text-sky-500" aria-hidden="true" />
          {todayLabel}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Missing reports"
          icon={CalendarX2}
          value={submittedQuery.isLoading ? "–" : missedDays.length}
          tone={missedDays.length > 0 ? "warn" : "default"}
        />
        <Stat
          label="Rejected reports"
          icon={CircleX}
          value={statsLoading ? "–" : (counts?.REJECTED ?? 0)}
          tone={(counts?.REJECTED ?? 0) > 0 ? "danger" : "default"}
        />
        <Stat
          label="Awaiting review"
          icon={Eye}
          value={statsLoading ? "–" : (counts?.SUBMITTED ?? 0)}
          tone={(counts?.SUBMITTED ?? 0) > 0 ? "warn" : "default"}
        />
        <Stat
          label="Hours in last 7 days"
          icon={Clock}
          value={
            statsLoading ? "–" : `${formatHours(totalHours)}${truncated ? "+" : ""}`
          }
        />
      </div>

      <section className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 ${hero.box}`}>
        {heroState === "loading" && <Skeleton lines={2} />}

        {heroState === "error" && (
          <ErrorNote message="Could not check your reports. Refresh to try again." />
        )}

        {heroReady && (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-8 ${hero.iconWrap}`}
            >
              {HeroIcon && <HeroIcon className="h-7 w-7" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                {HERO_COPY[heroState as "done" | "due" | "off"].title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {HERO_COPY[heroState as "done" | "due" | "off"].text}
              </p>
            </div>
            {heroState === "due" && (
              <Link
                href={ROUTES.newReport(todayKey)}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Write today&apos;s report
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5 xl:gap-6">
        <div className="min-w-0 space-y-5 xl:col-span-3">
          {attention.length > 0 && (
            <Panel
              title="Needs your attention"
              icon={CircleAlert}
              iconTone="warn"
              hint="Things to fix or finish"
              count={attention.length}
            >
              <ul className="divide-y divide-border">
                {attention.map((item) => (
                  <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <IconTile icon={item.icon} tone={item.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary wrap-anywhere">
                        {item.title}
                      </p>
                      {item.detail && (
                        <p className="mt-0.5 text-sm text-muted-foreground wrap-anywhere">
                          {item.detail}
                        </p>
                      )}
                      {item.days && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.days.map((key) => (
                            <Link
                              key={key}
                              href={ROUTES.newReport(key)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary"
                            >
                              <Plus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                              {formatDayKey(key)}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.href && (
                      <Link
                        href={item.href}
                        className="group inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
                      >
                        {item.action}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Recent reports"
            icon={FileText}
            iconTone="blue"
            hint="Rejected reports first, then newest"
            action={{ href: ROUTES.reports, label: "View all" }}
          >
            {reportsQuery.isLoading ? (
              <Skeleton lines={5} />
            ) : reportsQuery.isError ? (
              <ErrorNote message="Could not load reports." />
            ) : sortedReports.length === 0 ? (
              <EmptyNote message="No reports in the last 7 days. Submit one to see it here." />
            ) : (
              <ul className="-mx-3 space-y-0.5">
                {sortedReports.slice(0, 8).map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Where you left off"
            icon={Bookmark}
            iconTone="violet"
            hint="From your most recent report"
            action={
              latest ? { href: ROUTES.report(latest.id), label: "Open report" } : undefined
            }
          >
            {reportsQuery.isLoading ? (
              <Skeleton lines={4} />
            ) : reportsQuery.isError ? (
              <ErrorNote message="Could not load your latest report." />
            ) : !latest ? (
              <EmptyNote message="Submit a report and your in-progress tasks and next priority will show here." />
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  {formatDayKey(reportDayKey(latest))} on{" "}
                  <span className="font-medium text-text-primary">
                    {latest.project?.name ?? "General work"}
                  </span>
                </p>

                <div className="flex gap-3">
                  <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text-primary">
                      Still in progress
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground wrap-anywhere">
                      {latest.tasksInProgress?.trim() || "Nothing listed."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-border pt-5">
                  <CalendarClock
                    className="mt-0.5 h-4 w-4 shrink-0 text-sky-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text-primary">Planned next</h3>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground wrap-anywhere">
                      {latest.tomorrowPriority?.trim() || "Nothing listed."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5 xl:col-span-2">
          <Panel title="My projects" icon={Briefcase} iconTone="success" hint="Active and upcoming">
            {projectsQuery.isLoading ? (
              <Skeleton lines={3} />
            ) : projectsQuery.isError ? (
              <ErrorNote message="Could not load your projects." />
            ) : projects.length === 0 ? (
              <EmptyNote message="You are not on any active project yet. Your team lead can add you." />
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {projects.map((project) => {
                    const days = allocationToDays(project.allocation);
                    const deadline = deadlineInfo(project.endDate, todayKey);
                    return (
                      <li
                        key={project.id}
                        className="flex items-start justify-between gap-3 rounded-xl py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 gap-3">
                          <IconTile icon={Briefcase} tone="success" />
                          <div className="min-w-0">
                            <Link
                              href={project.href}
                              className="block truncate text-sm font-medium text-text-primary hover:text-primary hover:underline"
                            >
                              {project.name}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                              <span>{project.code}</span>
                              <span>
                                {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                              </span>
                              {!project.isLead && project.leadName && (
                                <span>Lead: {project.leadName}</span>
                              )}
                            </div>
                            {deadline && (
                              <p
                                className={`mt-1 flex items-center gap-1.5 text-sm ${deadline.className}`}
                              >
                                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                                {deadline.text}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tabular-nums text-text-primary">
                            {days} {days === "1" ? "day" : "days"} / week
                          </span>
                          {project.isLead && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Lead
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Total: {Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1)} of{" "}
                  {FULL_WEEK_DAYS} days / week
                </p>
              </>
            )}
          </Panel>

          <Panel
            title="Notifications"
            icon={Bell}
            iconTone="violet"
            hint="Unread"
            count={unreadCount}
            action={{ href: ROUTES.notifications, label: "View all" }}
          >
            {notificationsQuery.isLoading ? (
              <Skeleton lines={3} />
            ) : notificationsQuery.isError ? (
              <ErrorNote message="Could not load notifications." />
            ) : unread.length === 0 ? (
              <EmptyNote message="You are all caught up." />
            ) : (
              <ul className="divide-y divide-border">
                {unread.map((n) => {
                  const style = NOTIFICATION_STYLES[n.type] ?? {
                    icon: Bell,
                    tone: "default" as Tone,
                  };
                  const content = (
                    <div className="flex gap-3">
                      <IconTile icon={style.icon} tone={style.tone} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id} className="py-4 first:pt-0 last:pb-0">
                      {n.href ? (
                        <Link
                          href={n.href}
                          className="block transition-opacity hover:opacity-80"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}