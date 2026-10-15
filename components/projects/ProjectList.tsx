"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PROJECT_STATUSES } from "@/lib/validations/project";
import { STATUS, fmtDate } from "@/lib/projects/ui";

type Row = {
    id: string;
    name: string;
    code: string;
    status: string;
    endDate: string | null;
    department: { name: string } | null;
    lead: { name: string };
    _count: { members: number };
};

type Props = { basePath: string; canCreate?: boolean };

const control =
    "h-11 rounded-lg border border-gray-200 bg-white px-3.5 text-sm shadow-sm transition hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

export function ProjectsList({ basePath, canCreate = false }: Props) {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [departmentId, setDepartmentId] = useState("");

    const { data: options } = useQuery<{
        departments: { id: string; name: string }[];
    }>({
        queryKey: ["admin-project-options"],
        queryFn: async () => (await fetch("/api/projects/options")).json(),
    });

    const { data, isLoading, isError } = useQuery<Row[]>({
        queryKey: ["admin-projects", q, status, departmentId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (status) params.set("status", status);
            if (departmentId) params.set("departmentId", departmentId);
            const res = await fetch(`/api/projects?${params}`);
            if (!res.ok) throw new Error("Failed to load projects");
            return res.json();
        },
    });

    const filtered = !!(q || status || departmentId);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or code"
                    className={`${control} w-full sm:w-72`}
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={control}
                >
                    <option value="">All statuses</option>
                    {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {STATUS[s].label}
                        </option>
                    ))}
                </select>
                <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className={control}
                >
                    <option value="">All departments</option>
                    {options?.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>

                {canCreate && (
                    <Link
                        href={`${basePath}/new`}
                        className="ml-auto inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                    >
                        New project
                    </Link>
                )}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-190 text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs text-secondary">
                            <th className="px-5 py-3 font-medium">Project</th>
                            <th className="px-5 py-3 font-medium">Department</th>
                            <th className="px-5 py-3 font-medium">Lead</th>
                            <th className="px-5 py-3 font-medium">Team</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Ends</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={6} className="px-5 py-4">
                                        <div className="h-5 animate-pulse rounded bg-gray-100" />
                                    </td>
                                </tr>
                            ))}

                        {isError && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-secondary">
                                    Projects could not be loaded. Refresh the page to try again.
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isError && data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center">
                                    <p className="font-medium text-gray-900">
                                        {filtered ? "No projects match your filters" : "No projects yet"}
                                    </p>
                                    <p className="mt-1 text-sm text-secondary">
                                        {filtered
                                            ? "Try a different search or clear a filter."
                                            : canCreate
                                                ? "Create the first project to start assigning people."
                                                : "Projects will appear here once they are created."}
                                    </p>
                                </td>
                            </tr>
                        )}

                        {data?.map((p) => {
                            const s = STATUS[p.status] ?? STATUS.PLANNING;
                            return (
                                <tr key={p.id} className="transition hover:bg-gray-50">
                                    <td className="px-5 py-4">
                                        <Link
                                            href={`${basePath}/${p.id}`}
                                            className="font-medium text-gray-900 hover:text-primary"
                                        >
                                            {p.name}
                                        </Link>
                                        <p className="text-xs text-secondary">{p.code}</p>
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">
                                        {p.department?.name ?? "None"}
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">{p.lead.name}</td>
                                    <td className="px-5 py-4 tabular-nums text-gray-700">
                                        {p._count.members}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${s.pill}`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                            {s.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">{fmtDate(p.endDate)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}