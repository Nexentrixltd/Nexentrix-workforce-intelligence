"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    WEEK_DAYS,
    daysLabel,
    initials,
    loadTone,
    toDays,
} from "@/lib/projects/ui";

type Row = {
    id: string;
    name: string;
    role: string;
    department: string | null;
    totalAllocation: number;
    projects: { id: string; name: string; code: string; allocation: number | null }[];
};

type Filter = "all" | "over" | "room";

export function WorkloadTable({ projectsBasePath }: { projectsBasePath: string }) {
    const [filter, setFilter] = useState<Filter>("all");

    const { data, isLoading, isError } = useQuery<Row[]>({
        queryKey: ["project-workload"],
        queryFn: async () => {
            const res = await fetch("/api/projects/workload");
            if (!res.ok) throw new Error("Failed to load workload");
            return res.json();
        },
    });

    const rows = (data ?? [])
        .map((r) => ({ ...r, days: toDays(r.totalAllocation) }))
        .sort((a, b) => b.days - a.days);

    const over = rows.filter((r) => r.days > WEEK_DAYS);
    const room = rows.filter((r) => WEEK_DAYS - r.days >= 2);
    const shown = filter === "over" ? over : filter === "room" ? room : rows;

    const chips: { key: Filter; label: string; count: number }[] = [
        { key: "all", label: "Everyone", count: rows.length },
        { key: "over", label: "Overbooked", count: over.length },
        { key: "room", label: "2+ days free", count: room.length },
    ];

    return (
        <div>
            <p className="max-w-2xl text-sm text-secondary">
                Each person has {WEEK_DAYS} working days a week. The bar shows how many
                of those are booked across projects that are planned, active or on hold.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) => (
                    <button
                        key={c.key}
                        type="button"
                        onClick={() => setFilter(c.key)}
                        aria-pressed={filter === c.key}
                        className={`h-9 rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${filter === c.key
                                ? "border-primary bg-primary/5 font-medium text-primary"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        {c.label} <span className="tabular-nums text-secondary">{c.count}</span>
                    </button>
                ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-180 text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs text-secondary">
                            <th className="px-5 py-3 font-medium">Person</th>
                            <th className="px-5 py-3 font-medium">Projects</th>
                            <th className="px-5 py-3 font-medium">Days booked</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={3} className="px-5 py-4">
                                        <div className="h-5 animate-pulse rounded bg-gray-100" />
                                    </td>
                                </tr>
                            ))}

                        {isError && (
                            <tr>
                                <td colSpan={3} className="px-5 py-10 text-center text-secondary">
                                    Workload could not be loaded. Refresh the page to try again.
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isError && shown.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-5 py-10 text-center text-secondary">
                                    {filter === "over"
                                        ? "Nobody is overbooked right now."
                                        : "No one matches this filter."}
                                </td>
                            </tr>
                        )}

                        {shown.map((r) => {
                            const tone = loadTone(r.days);
                            return (
                                <tr key={r.id} className="align-middle">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                {initials(r.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-gray-900">
                                                    {r.name}
                                                </p>
                                                <p className="truncate text-xs text-secondary">
                                                    {r.department ?? "No department"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        {r.projects.length === 0 ? (
                                            <span className="text-secondary">Not on any project</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.projects.slice(0, 3).map((p) => (
                                                    <Link
                                                        key={p.id}
                                                        href={`${projectsBasePath}/${p.id}`}
                                                        className="max-w-56 truncate rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 transition hover:bg-primary/10 hover:text-primary"
                                                    >
                                                        {p.name}
                                                        {p.allocation != null &&
                                                            `, ${daysLabel(toDays(p.allocation))}`}
                                                    </Link>
                                                ))}
                                                {r.projects.length > 3 && (
                                                    <span className="px-1 py-1 text-xs text-secondary">
                                                        +{r.projects.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="w-44">
                                            <div className="flex items-baseline justify-between text-xs">
                                                <span className={`font-medium ${tone.text}`}>
                                                    {r.days} of {WEEK_DAYS} days
                                                </span>
                                                {r.days > WEEK_DAYS && (
                                                    <span className="font-medium text-red-600">
                                                        Overbooked
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className={`h-full rounded-full ${tone.bar}`}
                                                    style={{
                                                        width: `${Math.min((r.days / WEEK_DAYS) * 100, 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}