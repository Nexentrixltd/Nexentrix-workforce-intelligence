"use client";

import { useState } from "react";
import { UserCog, Users } from "lucide-react";
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

export function ArmsList({ arms, candidates }: Props) {
    const [editing, setEditing] = useState<ArmCard | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {arms.map((arm) => {
                    const title = arm.isShared ? "Chief of Staff" : "Arm Head";
                    const memberTotal = arm.departments.reduce((n, d) => n + d.members, 0);

                    return (
                        <section
                            key={arm.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold">{arm.name}</h2>
                                        {arm.isShared && (
                                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                                Shared services
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                        <Users size={14} className="text-slate-400" />
                                        {arm.departments.length} departments · {memberTotal} members
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEditing(arm)}
                                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    <UserCog size={16} />
                                    {arm.head ? `Change ${title}` : `Assign ${title}`}
                                </button>
                            </div>

                            <div className="border-b border-slate-100 px-5 py-4">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
                                {arm.head ? (
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                                            {arm.head.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{arm.head.name}</p>
                                            <p className="truncate text-xs text-slate-500">{arm.head.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                        No {title} assigned. Reports for this arm have no reviewer.
                                    </p>
                                )}
                            </div>

                            <ul className="divide-y divide-slate-100">
                                {arm.departments.map((d) => (
                                    <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-800">{d.name}</p>
                                            <p className="truncate text-xs text-slate-500">
                                                {d.leadName ? `Lead: ${d.leadName}` : <span className="italic">No Team Lead</span>}
                                                {" · "}
                                                {d.members} {d.members === 1 ? "member" : "members"}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${d.status === "ACTIVE"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {d.status === "ACTIVE" ? "Active" : "Planned"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
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