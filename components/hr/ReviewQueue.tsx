import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueFilter, ReviewQueueData } from "@/lib/staff-records/hr-queries";
import { Avatar } from "../shared/people";
import { StatusChip } from "../shared/reviewUI";

const FILTERS: { key: QueueFilter; label: string }[] = [
    { key: "all", label: "All staff" },
    { key: "review", label: "Needs review" },
    { key: "incomplete", label: "Incomplete" },
    { key: "rejected", label: "Rejected" },
];

export function ReviewQueue({
    data,
    filter,
    q,
    basePath,
}: {
    data: ReviewQueueData;
    filter: QueueFilter;
    q: string;
    basePath: string;
}) {
    const { rows, stats } = data;

    const link = (f: QueueFilter) => {
        const params = new URLSearchParams();
        if (f !== "all") params.set("filter", f);
        if (q) params.set("q", q);
        const s = params.toString();
        return s ? `${basePath}?${s}` : basePath;
    };

    const cards = [
        { label: "Active staff", value: stats.staff, sub: "In this view", filter: "all" as const, tone: "text-foreground" },
        { label: "Awaiting review", value: stats.needsReview, sub: `${stats.pendingItems} items to check`, filter: "review" as const, tone: "text-amber-600 dark:text-amber-400" },
        { label: "Rejected", value: stats.rejected, sub: "Waiting for staff to fix", filter: "rejected" as const, tone: "text-red-600 dark:text-red-400" },
        { label: "Incomplete", value: stats.incomplete, sub: "Missing records", filter: "incomplete" as const, tone: "text-orange-600 dark:text-orange-400" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c) => (
                    <Link
                        key={c.label}
                        href={link(c.filter)}
                        className="rounded-2xl border border-border/60 bg-muted/20 p-5 transition hover:border-primary/40 hover:bg-muted/40"
                    >
                        <p className="text-sm text-muted-foreground">{c.label}</p>
                        <p className={cn("mt-2 text-3xl font-bold tracking-tight", c.tone)}>{c.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                    </Link>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter staff">
                    {FILTERS.map((f) => (
                        <Link
                            key={f.key}
                            href={link(f.key)}
                            role="tab"
                            aria-selected={filter === f.key}
                            className={cn(
                                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                                filter === f.key
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            )}
                        >
                            {f.label}
                        </Link>
                    ))}
                </div>

                <form action={basePath} method="get" className="relative w-full sm:w-72">
                    {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        name="q"
                        defaultValue={q}
                        placeholder="Search name or email"
                        className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                </form>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                    No staff match this view.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/60">
                    <table className="w-full min-w-215 text-left text-sm">
                        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Staff</th>
                                <th className="px-3 py-3 font-medium">Personal</th>
                                <th className="px-3 py-3 font-medium">Contacts</th>
                                <th className="px-3 py-3 font-medium">Documents</th>
                                <th className="px-3 py-3 font-medium">Payroll</th>
                                <th className="px-3 py-3 font-medium">Signatory</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {rows.map((r) => (
                                <tr key={r.id} className="transition hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <Link href={`${basePath}/${r.id}`} className="flex items-center gap-3">
                                            <Avatar id={r.id} name={r.name} imgURL={r.image ? r.image : undefined} className="h-10 w-10 rounded shrink-0" />
                                            <span className="min-w-0">
                                                <span className="block truncate font-semibold">{r.name}</span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {r.department ?? r.email}
                                                </span>
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-3 py-3"><StatusChip state={r.sections.profile} /></td>
                                    <td className="px-3 py-3"><StatusChip state={r.sections.contacts} /></td>
                                    <td className="px-3 py-3"><StatusChip state={r.sections.documents} /></td>
                                    <td className="px-3 py-3"><StatusChip state={r.sections.payroll} /></td>
                                    <td className="px-3 py-3"><StatusChip state={r.sections.signatory} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`${basePath}/${r.id}`}
                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                                        >
                                            {r.pending > 0 ? `Review (${r.pending})` : "Open"}
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}