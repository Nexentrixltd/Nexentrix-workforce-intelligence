"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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

type ReportStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type ReportItem = {
  id: string;
  reportDate: string;
  status: ReportStatus;
  hoursSpent: number;
  tasksCompleted: string | null;
  tasksInProgress: string | null;
  blockers: string | null;
  tomorrowPriority: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
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
  department: string | null;
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

const ICONS = {
  checkCircle: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  clock: "M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  alert:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  plus: "M12 4.5v15m7.5-7.5h-15",
  document:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  eye: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  xCircle: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

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
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {title}
          {count ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
              {count}
            </span>
          ) : null}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="text-sm font-medium text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className="p-5">{children}</div>
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
        className={`block rounded-lg px-3 py-2.5 transition-colors ${rejected
          ? "border-l-2 border-red-500 bg-red-500/10 hover:bg-red-500/15"
          : "hover:bg-black/5 dark:hover:bg-white/5"
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
          <p className="mt-2 text-sm text-red-700 dark:text-red-300 wrap-anywhere">
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
  icon: string;
  tone?: "default" | "warn" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-text-primary";

  const iconStyle =
    tone === "danger"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-black/5 text-muted-foreground dark:bg-white/10";

  return (
    <div className="flex items-start justify-between gap-3 bg-muted px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${valueColor}`}
        >
          {value}
        </p>
      </div>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
      >
        <Icon d={icon} className="h-5 w-5" />
      </div>
    </div>
  );
}

type HeroState = "loading" | "error" | "done" | "due" | "off";

const HERO_STYLES: Record<
  HeroState,
  { box: string; iconWrap: string; icon: string }
> = {
  loading: { box: "border-border bg-muted", iconWrap: "", icon: "" },
  error: { box: "border-border bg-muted", iconWrap: "", icon: "" },
  done: {
    box: "border-emerald-500/30 bg-emerald-500/10",
    iconWrap: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    icon: ICONS.checkCircle,
  },
  due: {
    box: "border-amber-500/40 bg-amber-500/10",
    iconWrap: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    icon: ICONS.clock,
  },
  off: {
    box: "border-border bg-muted",
    iconWrap: "bg-black/5 text-muted-foreground dark:bg-white/10",
    icon: ICONS.calendar,
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
  const hoursByProject = Object.values(
    reports.reduce<Record<string, { name: string; hours: number }>>((acc, r) => {
      const key = r.project?.id ?? "general";
      const name = r.project?.name ?? "General work";
      acc[key] = { name, hours: (acc[key]?.hours ?? 0) + r.hoursSpent };
      return acc;
    }, {}),
  ).sort((a, b) => b.hours - a.hours);
  const latest = reports[0];
  const blockers = reports.filter((r) => r.blockers && r.blockers.trim()).slice(0, 3);

  const feedback = reports
    .filter((r) => r.reviewedAt && r.reviewNote && r.reviewNote.trim())
    .sort(
      (a, b) =>
        new Date(b.reviewedAt as string).getTime() -
        new Date(a.reviewedAt as string).getTime(),
    )
    .slice(0, 4);

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
  const heroReady = heroState === "done" || heroState === "due" || heroState === "off";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-5xl font-triakis tracking-tight text-text-primary">
            Hello{user?.name ? `, ${String(user.name).split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
            {todayLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        <Stat
          label="Reports in last 7 days"
          icon={ICONS.document}
          value={statsLoading ? "–" : (reportsQuery.data?.total ?? 0)}
        />
        <Stat
          label="Hours logged"
          icon={ICONS.clock}
          value={
            statsLoading ? "–" : `${formatHours(totalHours)}${truncated ? "+" : ""}`
          }
        />
        <Stat
          label="Reports awaiting review"
          icon={ICONS.eye}
          value={statsLoading ? "–" : (counts?.SUBMITTED ?? 0)}
          tone={(counts?.SUBMITTED ?? 0) > 0 ? "warn" : "default"}
        />
        <Stat
          label="Rejected Reports."
          icon={ICONS.xCircle}
          value={statsLoading ? "–" : (counts?.REJECTED ?? 0)}
          tone={(counts?.REJECTED ?? 0) > 0 ? "danger" : "default"}
        />
      </div>

      <section className={`rounded-xl border p-5 sm:p-6 ${hero.box}`}>
        {heroState === "loading" && <Skeleton lines={2} />}

        {heroState === "error" && (
          <ErrorNote message="Could not check your reports. Refresh to try again." />
        )}

        {heroReady && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${hero.iconWrap}`}
            >
              <Icon d={hero.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-text-primary">
                {HERO_COPY[heroState as "done" | "due" | "off"].title}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {HERO_COPY[heroState as "done" | "due" | "off"].text}
              </p>
            </div>
            {heroState === "due" && (
              <Link
                href={ROUTES.newReport(todayKey)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-text-primary transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Write today&apos;s report
              </Link>
            )}
          </div>
        )}

        {heroReady && missedDays.length > 0 && (
          <div className="mt-5 border-t border-border pt-4 dark:border-white/10">
            <p className="text-sm font-medium text-text-primary">
              {missedDays.length === 1
                ? "1 report is missing from the last "
                : `${missedDays.length} reports are missing from the last `}
              {SUBMIT_WINDOW_DAYS} days
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missedDays.map((key) => (
                <Link
                  key={key}
                  href={ROUTES.newReport(key)}
                  className="rounded-full border border-black/10 bg-white/60 px-3.5 py-1 text-sm font-medium text-text-primary transition-colors hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {formatDayKey(key)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <Panel
            title="Recent reports"
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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  From your {formatDayKey(reportDayKey(latest))} report on{" "}
                  <span className="font-medium text-text-primary">
                    {latest.project?.name ?? "General work"}
                  </span>
                </p>
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Still in progress</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground wrap-anywhere">
                    {latest.tasksInProgress?.trim() || "Nothing listed."}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Planned next</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground wrap-anywhere">
                    {latest.tomorrowPriority?.trim() || "Nothing listed."}
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Reviewer feedback">
            {reportsQuery.isLoading ? (
              <Skeleton lines={4} />
            ) : reportsQuery.isError ? (
              <ErrorNote message="Could not load feedback." />
            ) : feedback.length === 0 ? (
              <EmptyNote message="No reviewer notes yet. Notes from your team lead show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {feedback.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={ROUTES.report(r.id)} className="block hover:opacity-80">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {r.project?.name ?? "General work"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDayKey(reportDayKey(r))}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-2 text-sm text-text-primary wrap-anywhere">{r.reviewNote}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.reviewedBy?.name ?? "Reviewer"}
                        {r.reviewedAt ? `, ${timeAgo(r.reviewedAt)}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel title="My projects">
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
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
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
                            <p className={`mt-0.5 text-sm ${deadline.className}`}>
                              {deadline.text}
                            </p>
                          )}
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

                <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
                  {overAllocated && (
                    <Icon
                      d={ICONS.alert}
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                    />
                  )}
                  <p
                    className={
                      overAllocated
                        ? "text-red-700 dark:text-red-300"
                        : "text-muted-foreground"
                    }
                  >
                    Total: {Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1)}{" "}
                    of {FULL_WEEK_DAYS} days / week
                    {overAllocated
                      ? ". You are over-allocated. Talk to your team lead."
                      : ""}
                  </p>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Time this week">
            {reportsQuery.isLoading ? (
              <Skeleton lines={3} />
            ) : reportsQuery.isError ? (
              <ErrorNote message="Could not load your hours." />
            ) : hoursByProject.length === 0 ? (
              <EmptyNote message="No hours logged in the last 7 days." />
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {hoursByProject.map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0"
                    >
                      <span className="min-w-0 truncate text-text-primary">{row.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatHours(row.hours)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-text-primary">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatHours(totalHours)}
                    {truncated ? "+" : ""}
                  </span>
                </div>
                {truncated && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Based on your latest {reports.length} reports.
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel title="Blockers you reported">
            {reportsQuery.isLoading ? (
              <Skeleton lines={3} />
            ) : reportsQuery.isError ? (
              <ErrorNote message="Could not load blockers." />
            ) : blockers.length === 0 ? (
              <EmptyNote message="No blockers reported in the last 7 days." />
            ) : (
              <ul className="divide-y divide-border">
                {blockers.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={ROUTES.report(r.id)} className="block hover:opacity-80">
                      <p className="line-clamp-3 whitespace-pre-line text-sm text-text-primary wrap-anywhere">
                        {r.blockers}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>{r.project?.name ?? "General work"}</span>
                        <span>{formatDayKey(reportDayKey(r))}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Notifications"
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
                  const content = (
                    <>
                      <p className="text-sm font-medium text-text-primary">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </>
                  );
                  return (
                    <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                      {n.href ? (
                        <Link href={n.href} className="block hover:opacity-80">
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
