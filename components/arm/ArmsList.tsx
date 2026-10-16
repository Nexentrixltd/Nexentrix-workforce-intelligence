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

type Props = { arms: ArmCard[]; candidates: HeadCandidate[]; readOnly?: boolean };

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ArmsList({ arms, candidates, readOnly = false }: Props) {
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
                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm mt-10"
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
                                        className={`shrink-0 text-muted-foreground transition-transform group-hover:text-slate-600 ${isCollapsed ? "-rotate-90" : ""
                                            }`}
                                    />
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="text-xl tracking-tight text-text-primary">
                                                {arm.name}
                                            </span>
                                            {arm.isShared && (
                                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-primary">
                                                    Shared services
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                            {plural(arm.departments.length, "department")},{" "}
                                            {plural(memberTotal, "member")}
                                        </span>
                                    </span>
                                </button>

                                <div className="flex items-center gap-3">
                                    {arm.head ? (
                                        <>
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                                                {initials(arm.head.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">{title}</p>
                                                <p className="truncate text-sm font-semibold text-text-primary">
                                                    {arm.head.name}
                                                </p>
                                                {readOnly && (
                                                    <p className="truncate text-xs text-muted-foreground">{arm.head.email}</p>
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(arm)}
                                                    className="ml-1 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm font-medium text-text-primary transition hover:border-border hover:bg-muted-foreground/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    <UserCog size={16} />
                                                    Change
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-">No {title} yet</p>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(arm)}
                                                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                                                >
                                                    <UserPlus size={16} />
                                                    Assign {title}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </header>

                            {!arm.head && !isCollapsed && (
                                <p className="bg-status-warning-bg px-6 py-2.5 text-sm text-status-warning-text">
                                    Reports for this arm have no reviewer until a {title} is
                                    assigned.
                                </p>
                            )}

                            {!isCollapsed && (
                                <div id={panelId} className="border-t border-border">
                                    {arm.departments.length === 0 ? (
                                        <p className="px-6 py-6 text-sm text-muted-foreground">
                                            No departments in this arm yet.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="hidden grid-cols-[1.4fr_1.2fr_90px] bg-muted gap-4 px-6 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
                                                <span>Department</span>
                                                <span>Team lead</span>
                                                <span className="text-right">Members</span>
                                            </div>
                                            <ul className="divide-y divide-border">
                                                {arm.departments.map((d) => (
                                                    <li
                                                        key={d.id}
                                                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-6 py-3.5 sm:grid-cols-[1.4fr_1.2fr_90px]"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <p className="truncate text-sm font-medium text-text-primary">
                                                                {d.name}
                                                            </p>
                                                            {d.status === "PLANNED" && (
                                                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-primary">
                                                                    Planned
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="order-3 col-span-2 truncate text-sm sm:order-0 sm:col-span-1">
                                                            {d.leadName ? (
                                                                <span className="text-text-primary font-semibold">
                                                                    {d.leadName}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-status-warning-bg" />
                                                                    No team lead
                                                                </span>
                                                            )}
                                                        </p>

                                                        <p className={`text-right text-sm tabular-nums ${d.members > 0 ? "text-text-primary font-semibold" : "text-muted-foreground"}`}>
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

            {!readOnly && (
                <AssignHeadModal
                    key={editing?.id ?? "closed"}
                    arm={editing}
                    candidates={candidates}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}