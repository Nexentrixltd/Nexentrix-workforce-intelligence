"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { STATUS, fmtDate } from "@/lib/projects/ui";
import { useRouter } from "next/navigation";

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
    const router = useRouter();

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
            <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-190 text-left text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                            <th className="px-5 py-3 font-medium">Project</th>
                            <th className="px-5 py-3 font-medium">Department</th>
                            <th className="px-5 py-3 font-medium">Lead</th>
                            <th className="px-5 py-3 font-medium">Team</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Ends</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={6} className="px-5 py-4">
                                        <div className="h-5 animate-pulse rounded bg-border" />
                                    </td>
                                </tr>
                            ))}

                        {isError && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                                    Projects could not be loaded. Refresh the page to try again.
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isError && data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center">
                                    <p className="font-medium text-muted-foreground">
                                        {filtered ? "No projects match your filters" : "No projects yet"}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
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
                                <tr
                                    key={p.id}
                                    onClick={() => router.push(`${basePath}/${p.id}`)}
                                    className="cursor-pointer transition hover:bg-muted/50"
                                >
                                    <td className="px-5 py-4">
                                        <Link
                                            href={`${basePath}/${p.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-medium text-text-primary hover:text-primary"
                                        >
                                            {p.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{p.code}</p>
                                    </td>
                                    <td className="px-5 py-4 text-muted-foreground">
                                        {p.department?.name ?? "None"}
                                    </td>
                                    <td className="px-5 py-4 text-muted-foreground">{p.lead.name}</td>
                                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
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
                                    <td className="px-5 py-4 text-muted-foreground">{fmtDate(p.endDate)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}