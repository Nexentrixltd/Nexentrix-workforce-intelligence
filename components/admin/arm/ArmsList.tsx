"use client";

import { useState } from "react";
import { ChevronDown, UserCog, UserPlus } from "lucide-react";
import AssignHeadModal from "./AssignHeadModal";

export type ArmCard = {
    id: string;
    name: string;
    isShared: boolean;
    head: { id: string; name: string; email: string } | null;
    departments: {
        id: string;
        name: string;
        status: "ACTIVE" | "PLANNED";
        leadName: string | null;
        members: number;
    }[];
};

export type HeadCandidate = {
    id: string;
    name: string;
    email: string;
    role: string;
    departmentName: string | null;
};

type Props = { arms: ArmCard[]; candidates: HeadCandidate[] };

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ArmsList({ arms, candidates }: Props) {
    const [editing, setEditing] = useState<ArmCard | null>(null);
   const [expanded, setExpanded] = useState<Set<string>>(new Set());

const toggle = (id: string) =>
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

    return (
        <>
            <div className="mt-6 space-y-6">
                {arms.map((arm) => {
                    const title = arm.isShared ? "Chief of Staff" : "Arm Head";
                    const memberTotal = arm.departments.reduce(
                        (n, d) => n + d.members,
                        0,
                    );
                   const isCollapsed = !expanded.has(arm.id);
                    const panelId = `arm-${arm.id}-departments`;

                    return (
                        <section
                            key={arm.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                                <button
                                    type="button"
                                    onClick={() => toggle(arm.id)}
                                    aria-expanded={!isCollapsed}
                                    aria-controls={panelId}
                                    className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                >
                                    <ChevronDown
                                        size={18}
                                        className={`shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${isCollapsed ? "-rotate-90" : ""
                                            }`}
                                    />
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-triakis text-xl tracking-tight text-slate-900">
                                                {arm.name}
                                            </span>
                                            {arm.isShared && (
                                                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                                    Shared services
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-slate-500">
                                            {plural(arm.departments.length, "department")},{" "}
                                            {plural(memberTotal, "member")}
                                        </span>
                                    </span>
                                </button>

                                {/* Head */}
                                <div className="flex items-center gap-3">
                                    {arm.head ? (
                                        <>
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                                                {initials(arm.head.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500">{title}</p>
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {arm.head.name}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditing(arm)}
                                                className="ml-1 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                            >
                                                <UserCog size={16} />
                                                Change
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-amber-700">
                                                No {title} yet
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setEditing(arm)}
                                                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                                            >
                                                <UserPlus size={16} />
                                                Assign {title}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </header>

                            {!arm.head && !isCollapsed && (
                                <p className="border-t border-amber-100 bg-amber-50 px-6 py-2.5 text-sm text-amber-800">
                                    Reports for this arm have no reviewer until a {title} is
                                    assigned.
                                </p>
                            )}

                            {/* Departments */}
                            {!isCollapsed && (
                                <div id={panelId} className="border-t border-slate-100">
                                    {arm.departments.length === 0 ? (
                                        <p className="px-6 py-6 text-sm text-slate-500">
                                            No departments in this arm yet.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="hidden grid-cols-[1.4fr_1.2fr_90px] gap-4 px-6 py-2.5 text-xs font-medium text-slate-500 sm:grid">
                                                <span>Department</span>
                                                <span>Team lead</span>
                                                <span className="text-right">Members</span>
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {arm.departments.map((d) => (
                                                    <li
                                                        key={d.id}
                                                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-6 py-3.5 sm:grid-cols-[1.4fr_1.2fr_90px]"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <p className="truncate text-sm font-medium text-slate-900">
                                                                {d.name}
                                                            </p>
                                                            {d.status === "PLANNED" && (
                                                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                                    Planned
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="order-3 col-span-2 truncate text-sm sm:order-0 sm:col-span-1">
                                                            {d.leadName ? (
                                                                <span className="text-slate-700">
                                                                    {d.leadName}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-amber-700">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                    No team lead
                                                                </span>
                                                            )}
                                                        </p>

                                                        <p className="text-right text-sm tabular-nums text-slate-600">
                                                            {d.members}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            <AssignHeadModal
                key={editing?.id ?? "closed"}
                arm={editing}
                candidates={candidates}
                onClose={() => setEditing(null)}
            />
        </>
    );
}