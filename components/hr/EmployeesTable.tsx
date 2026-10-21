"use client";

import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import {
    Avatar,
    RoleBadge,
    StatusBadge,
    formatDate,
} from "@/components/shared/people";
import { Role } from "@/types/rbac";
import { useUserStore } from "@/store/userStore";

export type HrEmployeeRow = {
    id: string;
    name: string;
    email: string;
    role: Role;
    department: { id: string; name: string } | null;
    createdAt: string;
    deactivatedAt: string | null;
};

function DepartmentBadge({ department }: { department: HrEmployeeRow["department"] }) {
    if (!department) return <span className="text-sm text-slate-400">None</span>;
    return (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {department.name}
        </span>
    );
}

const selectCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:w-40";

export function EmployeesTable({
    users,
    departments,
}: {
    users: HrEmployeeRow[];
    departments: { id: string; name: string }[];
}) {
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<"ALL" | Role>("ALL");
    const [dept, setDept] = useState<string>("ALL");
    const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const user = useUserStore((s) => s.user)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            if (role !== "ALL" && u.role !== role) return false;
            if (status === "ACTIVE" && u.deactivatedAt) return false;
            if (status === "INACTIVE" && !u.deactivatedAt) return false;
            if (dept === "NONE" && u.department) return false;
            if (dept !== "ALL" && dept !== "NONE" && u.department?.id !== dept) return false;
            if (!q) return true;
            return (
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.department?.name.toLowerCase().includes(q) ?? false)
            );
        });
    }, [users, search, role, dept, status]);

    const emptyState = (
        <div className="px-6 py-16 text-center">
            <Filter size={30} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No employees found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
        </div>
    );

    return (
        <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold">All Employees</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Read-only view. Account changes are handled by an administrator.
                    </p>
                </div>
                <span className="w-fit shrink-0 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                    {users.length} people
                </span>
            </div>

            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
                <div className="relative w-full lg:max-w-sm">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email or department..."
                        aria-label="Search employees"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    aria-label="Filter by role"
                    className={selectCls}
                >
                    <option value="ALL">All roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="HR">HR</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="STAFF">Staff</option>
                </select>

                <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    aria-label="Filter by department"
                    className={selectCls}
                >
                    <option value="ALL">All departments</option>
                    <option value="NONE">No department</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    aria-label="Filter by status"
                    className={selectCls}
                >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
            </div>

            <div className="md:hidden">
                {filtered.length === 0 ? (
                    emptyState
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filtered.map((u) => (
                            <li key={u.id} className={`p-4 ${u.deactivatedAt ? "opacity-70" : ""}`}>
                                <div className="flex items-start gap-3">
                                    <Avatar id={u.id} name={u.name} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {u.id === user?.id ? "You" : u.name}
                                            </p>
                                            <RoleBadge role={u.role} />
                                        </div>
                                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <DepartmentBadge department={u.department} />
                                        <StatusBadge inactive={!!u.deactivatedAt} />
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {formatDate(u.createdAt)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr className="text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="whitespace-nowrap px-6 py-4">Date Added</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((u) => (
                            <tr
                                key={u.id}
                                className={`transition hover:bg-slate-50/70 ${u.deactivatedAt ? "opacity-70" : ""
                                    }`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar id={u.id} name={u.name} />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {u.id === user?.id ? "You" : u.name}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <RoleBadge role={u.role} />
                                </td>
                                <td className="px-6 py-4">
                                    <DepartmentBadge department={u.department} />
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge inactive={!!u.deactivatedAt} />
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                    {formatDate(u.createdAt)}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5}>{emptyState}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">
                Showing {filtered.length} of {users.length} people
            </div>
        </section>
    );
}