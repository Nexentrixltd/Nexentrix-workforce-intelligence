"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, Eye, Pencil, Trash2, Filter } from "lucide-react";
import ConfirmDeleteDepartmentModal, {
    type DepartmentToDelete,
} from "./ConfirmDeleteDepartmentModal";
import EditDepartmentModal, { type DepartmentToEdit } from "./EditDepartmentModal";
import { Role } from "@/types/rbac";

export type DepartmentRow = {
    id: string;
    name: string;
    slug: string;
    focus: string | null;
    status: "ACTIVE" | "PLANNED";
    armId: string;
    armName: string;
    teamLead: { id: string; name: string } | null;
    members: number;
};

const departmentColors = [
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-sky-600",
    "bg-violet-600",
    "bg-teal-600",
    "bg-orange-600",
];

function colorFor(id: string) {
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    return departmentColors[sum % departmentColors.length];
}

const iconBtn =
    "cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700";

const disabledBtn = "cursor-not-allowed rounded-lg p-2 text-slate-300";

function StatusBadge({ status }: { status: DepartmentRow["status"] }) {
    const active = status === "ACTIVE";
    return (
        <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
        >
            {active ? "Active" : "Planned"}
        </span>
    );
}

function LeadLabel({ lead }: { lead: DepartmentRow["teamLead"] }) {
    return lead ? (
        <span className="text-sm text-text-primary font-semibold">{lead.name}</span>
    ) : (
        <span className="text-sm italic text-muted-foreground">Unassigned</span>
    );
}

type Props = {
    departments: DepartmentRow[];
    viewerRole: Role;
    canEdit: boolean;
    canDelete: boolean;
    basePath: string;
};

export function DepartmentsTable({
    departments,
    viewerRole,
    canEdit,
    canDelete,
    basePath,
}: Props) {
    const [search, setSearch] = useState("");
    const [armFilter, setArmFilter] = useState("ALL");
    const [toDelete, setToDelete] = useState<DepartmentToDelete | null>(null);
    const [toEdit, setToEdit] = useState<DepartmentToEdit | null>(null);

    const arms = useMemo(() => {
        const seen = new Map<string, string>();
        for (const d of departments) if (!seen.has(d.armId)) seen.set(d.armId, d.armName);
        return Array.from(seen, ([id, name]) => ({ id, name }));
    }, [departments]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return departments.filter((d) => {
            if (armFilter !== "ALL" && d.armId !== armFilter) return false;
            if (!q) return true;
            return [d.name, d.armName, d.teamLead?.name ?? ""].some((v) =>
                v.toLowerCase().includes(q),
            );
        });
    }, [departments, search, armFilter]);

    const renderActions = (d: DepartmentRow) => {
        const deletable = d.members === 0 && !d.teamLead;

        return (
            <div className="flex items-center justify-end gap-1">
                <Link
                    href={`${basePath}/${d.id}`}
                    aria-label={`View ${d.name}`}
                    title="View"
                    className={iconBtn}
                >
                    <Eye size={18} />
                </Link>

                {canEdit && (
                    <button
                        type="button"
                        onClick={() =>
                            setToEdit({
                                id: d.id,
                                name: d.name,
                                focus: d.focus,
                                status: d.status,
                                teamLeadId: d.teamLead?.id ?? null,
                            })
                        }
                        aria-label={`Edit ${d.name}`}
                        title="Edit"
                        className={iconBtn}
                    >
                        <Pencil size={18} />
                    </button>
                )}

                {canDelete &&
                    (deletable ? (
                        <button
                            type="button"
                            onClick={() => setToDelete({ id: d.id, name: d.name, members: d.members })}
                            aria-label={`Delete ${d.name}`}
                            title="Delete"
                            className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            aria-label={`${d.name} cannot be deleted`}
                            title="Reassign its members and Team Lead before deleting"
                            className={disabledBtn}
                        >
                            <Trash2 size={18} />
                        </button>
                    ))}
            </div>
        );
    };

    const emptyState = (
        <div className="px-6 py-16 text-center">
            <Filter size={30} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-muted-foreground">No departments found</p>
            <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or arm filter.
            </p>
        </div>
    );

    return (
        <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold">All Departments</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Browse departments by arm, Team Lead and rollout status.
                    </p>
                </div>
                <span className="w-fit shrink-0 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-primary">
                    {departments.length} departments
                </span>
            </div>

            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-md">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by department, arm or Team Lead..."
                        aria-label="Search departments"
                        className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <select
                    value={armFilter}
                    onChange={(e) => setArmFilter(e.target.value)}
                    aria-label="Filter by arm"
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 md:w-auto"
                >
                    <option value="ALL">All arms</option>
                    {arms.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="md:hidden">
                {filtered.length === 0 ? (
                    emptyState
                ) : (
                    <ul className="divide-y divide-border">
                        {filtered.map((d) => (
                            <li key={d.id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${colorFor(d.id)}`}
                                    >
                                        {d.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-text-primary">{d.name}</p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.armName}</p>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <StatusBadge status={d.status} />
                                            <LeadLabel lead={d.teamLead} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Users size={15} className="text-muted-foreground" />
                                        {d.members}
                                    </span>
                                    {renderActions(d)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                    <thead className="bg-card">
                        <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted">
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Arm</th>
                            <th className="px-6 py-4">Team Lead</th>
                            {/* <th className="px-6 py-4">Status</th> */}
                            <th className="px-6 py-4">Members</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map((d) => (
                            <tr key={d.id} className="transition hover:bg-muted">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${colorFor(d.id)}`}
                                        >
                                            {d.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-text-primary">{d.name}</p>
                                            {d.focus && (
                                                <p className="max-w-xs truncate text-xs text-muted-foreground">{d.focus}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{d.armName}</td>
                                <td className="px-6 py-4">
                                    <LeadLabel lead={d.teamLead} />
                                </td>
                                {/* <td className="px-6 py-4">
                                    <StatusBadge status={d.status} />
                                </td> */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Users size={16} className="text-muted-foreground" />
                                        <span className={`${d.members > 0 ? "text-text-primary font-semibold" : "text-muted-foreground"}`}>{d.members}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{renderActions(d)}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6}>{emptyState}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-border bg-muted px-4 py-4 text-sm text-muted-foreground sm:px-5">
                Showing <span className="font-bold text-text-primary">{filtered.length}</span> of {departments.length} departments
            </div>

            <ConfirmDeleteDepartmentModal department={toDelete} onClose={() => setToDelete(null)} />
            <EditDepartmentModal
                department={toEdit}
                viewerRole={viewerRole}
                onClose={() => setToEdit(null)}
            />
        </section>
    );
}