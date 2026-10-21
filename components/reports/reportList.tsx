"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Search, X } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  reportDate: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  hoursSpent: number;
  mood: number;
  tasksCompleted: string;
  tasksInProgress: string | null;
  blockers: string | null;
  tomorrowPriority: string | null;
  reviewNote: string | null;
  user: { id: string; name: string };
  project: { id: string; name: string; code: string } | null;
  department: { name: string } | null;
  images: { id: string; width: number; height: number }[];
  canReview: boolean;
  reviewedAt: string | null;
  reviewedBy: { name: string } | null;
};

type Result = {
  items: Report[];
  total: number;
  pageSize: number;
  counts: { SUBMITTED: number; APPROVED: number; REJECTED: number };
};
type ProjectOption = { id: string; name: string };

const STATUS = {
  SUBMITTED: {
    label: "Awaiting review",
    pill: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  APPROVED: {
    label: "Approved",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    pill: "bg-red-500/10 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
} as const;

const TABS = [
  { value: "", label: "All" },
  { value: "SUBMITTED", label: "Awaiting review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const MOODS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😞", label: "Low energy" },
  2: { emoji: "😐", label: "Neutral" },
  3: { emoji: "🙂", label: "Focused" },
  4: { emoji: "😊", label: "High energy" },
  5: { emoji: "🔥", label: "Unstoppable" },
};

const control =
  "h-11 rounded-lg border border-border bg-card px-3.5 text-sm text-text-primary shadow-sm transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

const utc = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", ...o });

function DateTile({ iso }: { iso: string }) {
  return (
    <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-muted text-center">
      <span className="text-xs text-muted-foreground">
        {utc(iso, { month: "short" })}
      </span>
      <span className="text-lg font-semibold leading-none tabular-nums text-text-primary">
        {utc(iso, { day: "numeric" })}
      </span>
    </div>
  );
}

function ReviewPanel({
  reportId,
  onDone,
}: {
  reportId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && note.trim().length < 5) {
      setError("Tell them what to fix (at least 5 characters)");
      return;
    }
    setError(null);
    setPending(decision);

    const res = await fetch(`/api/reports/${reportId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim() || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      const e = body.error;
      toast.error(
        typeof e === "string"
          ? e
          : e
            ? ((Object.values(e)[0] as string[])?.[0] ?? "Could not save")
            : "Could not save your decision",
      );
      if (res.status === 409) qc.invalidateQueries({ queryKey: ["reports"] });
      return;
    }

    toast.success(decision === "APPROVED" ? "Report approved" : "Report rejected");
    qc.invalidateQueries({ queryKey: ["reports"] });
    onDone();
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <label
        htmlFor={`note-${reportId}`}
        className="text-sm font-medium text-text-primary"
      >
        Your review
      </label>
      <textarea
        id={`note-${reportId}`}
        rows={3}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setError(null);
        }}
        placeholder="Add a note. Required if you reject."
        className={`mt-1.5 w-full resize-y rounded-lg border bg-card px-3.5 py-3 text-sm text-text-primary transition placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 ${error ? "border-red-500" : "border-border focus:border-primary"
          }`}
      />
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => submit("APPROVED")}
          className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:opacity-60"
        >
          {pending === "APPROVED" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => submit("REJECTED")}
          className="h-10 rounded-lg border border-red-500/40 px-5 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 disabled:opacity-60 dark:text-red-400"
        >
          {pending === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}

function Block({
  title,
  text,
  warn = false,
}: {
  title: string;
  text: string | null;
  warn?: boolean;
}) {
  if (!text) return null;
  return (
    <div className={warn ? "border-l-2 border-amber-500 pl-4" : ""}>
      <h4 className="text-sm font-medium text-text-primary">{title}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

type Props = {
  showAuthor: boolean;
  mineOnly?: boolean;
};

export function ReportsList({ showAuthor, mineOnly = false }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  const update = (fn: () => void) => {
    fn();
    setPage(1);
    setOpen(null);
  };

  const clearFilters = () => {
    setQ("");
    setStatus("");
    setProjectId("");
    setFrom("");
    setTo("");
    setPage(1);
    setOpen(null);
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ["report-filter-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading, isError } = useQuery<Result>({
    queryKey: ["reports", { q, status, projectId, from, to, page, mineOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (projectId) params.set("projectId", projectId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (mineOnly) params.set("scope", "mine");
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const filtered = !!(q || status || projectId || from || to);
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const rangeStart = data ? (page - 1) * data.pageSize + 1 : 0;
  const rangeEnd = data ? Math.min(page * data.pageSize, data.total) : 0;

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-6 border-b border-border">
          {TABS.map((t) => {
            const c = data?.counts;
            const count = c
              ? t.value
                ? c[t.value as keyof typeof c]
                : c.SUBMITTED + c.APPROVED + c.REJECTED
              : null;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={status === t.value}
                onClick={() => update(() => setStatus(t.value))}
                className={`-mb-px border-b-2 pb-3 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${status === t.value
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-text-primary"
                  }`}
              >
                {t.label}
                {count != null && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => update(() => setQ(e.target.value))}
            placeholder={
              showAuthor ? "Search by person or work" : "Search your reports"
            }
            className={`${control} w-full pl-10`}
          />
        </div>

        <select
          value={projectId}
          onChange={(e) => update(() => setProjectId(e.target.value))}
          className={control}
          aria-label="Project"
        >
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => update(() => setFrom(e.target.value))}
            className={control}
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => update(() => setTo(e.target.value))}
            className={control}
            aria-label="To date"
          />
        </div>

        {filtered && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 rounded-lg px-3 text-sm font-medium text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-5">
                <div className="h-14 w-12 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Reports could not be loaded. Refresh the page to try again.
          </p>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="font-medium text-text-primary">
              {filtered ? "No reports match your filters" : "No reports yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered
                ? "Try a different search or clear a filter."
                : "Submitted reports will appear here."}
            </p>
          </div>
        )}

        <ul className="divide-y divide-border">
          {data?.items.map((r) => {
            const s = STATUS[r.status];
            const mood = MOODS[r.mood];
            const expanded = open === r.id;
            const panelId = `report-${r.id}`;
            const projectName = r.project?.name ?? "General work";

            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : r.id)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/15"
                >
                  <DateTile iso={r.reportDate} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <p className="font-medium text-text-primary">
                        {showAuthor ? r.user.name : projectName}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      {r.blockers && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Has blockers
                        </span>
                      )}
                    </div>

                    {showAuthor && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {projectName}
                        {r.department && (
                          <span className="ml-3">{r.department.name}</span>
                        )}
                      </p>
                    )}

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {r.tasksCompleted}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-text-primary">
                        {r.hoursSpent}h
                      </p>
                      <p className="mt-0.5 text-base" title={mood?.label}>
                        <span aria-hidden="true">{mood?.emoji}</span>
                        <span className="sr-only">{mood?.label}</span>
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div
                    id={panelId}
                    className="border-t border-border bg-muted/40 px-5 py-6"
                  >
                    <p className="mb-5 text-xs text-muted-foreground">
                      {utc(r.reportDate, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {mood && <span className="ml-3">{mood.label}</span>}
                    </p>

                    <div
                      className={`grid gap-8 ${r.images.length > 0
                        ? "lg:grid-cols-[minmax(0,1fr)_300px]"
                        : ""
                        }`}
                    >
                      <div className="space-y-5">
                        <Block title="Completed" text={r.tasksCompleted} />
                        <Block title="In progress" text={r.tasksInProgress} />
                        <Block title="Blockers" text={r.blockers} warn />
                        <Block
                          title="Priorities for tomorrow"
                          text={r.tomorrowPriority}
                        />
                        <Block title="Reviewer note" text={r.reviewNote} />
                      </div>

                      {r.images.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-text-primary">
                            Screenshots ({r.images.length})
                          </h4>
                          <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-2">
                            {r.images.map((img, i) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() =>
                                  setLightbox({
                                    src: `/api/reports/images/${img.id}?size=full`,
                                    alt: `Screenshot ${i + 1} from ${r.user.name}`,
                                  })
                                }
                                className="overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                              >
                                <img
                                  src={`/api/reports/images/${img.id}?size=thumb`}
                                  width={img.width}
                                  height={img.height}
                                  loading="lazy"
                                  decoding="async"
                                  alt={`Screenshot ${i + 1}`}
                                  className="aspect-square h-full w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {r.status !== "SUBMITTED" && r.reviewedBy && (
                      <p className="mt-6 text-xs text-muted-foreground">
                        {r.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                        {r.reviewedBy.name}
                        {r.reviewedAt &&
                          `, ${new Date(r.reviewedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}`}
                      </p>
                    )}

                    {r.canReview && r.status === "SUBMITTED" && (
                      <ReviewPanel reportId={r.id} onDone={() => setOpen(null)} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {rangeStart} to {rangeEnd} of {data.total} reports
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                setOpen(null);
              }}
              className="h-10 rounded-lg border border-border bg-card px-4 font-medium text-text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                setOpen(null);
              }}
              className="h-10 rounded-lg border border-border bg-card px-4 font-medium text-text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close screenshot"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <X size={20} />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}