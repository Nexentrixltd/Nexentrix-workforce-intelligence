"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PROJECT_STATUSES } from "@/lib/validations/project";
import { useUserStore } from "@/store/userStore";
import { Role } from "@/types/rbac";

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

const SUBTITLES: Partial<Record<Role, string>> = {
    ADMIN: "Create and manage projects, assign leads, and track team allocation.",
    HR: "Review all projects and see how people are allocated across them.",
    TEAM_LEAD: "Manage the projects you lead and your project members.",
    STAFF: "The projects you are part of.",
};

export default function AdminProjectsPage() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const user = useUserStore((s) => s.user)

    const { data: options } = useQuery<{ departments: { id: string; name: string }[] }>({
        queryKey: ["admin-project-options"],
        queryFn: async () => (await fetch("/api/projects/options")).json(),
    });

    const { data, isLoading } = useQuery<Row[]>({
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

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                        Projects
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        {user?.role ? SUBTITLES[user.role] : ""}
                    </p>
                </div>

                <Link
                    href="/admin/projects/new"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
                >
                    New project
                </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-10">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name or code"
                    className="rounded-md border px-3 py-2 text-sm"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                >
                    <option value="">All statuses</option>
                    {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s.replace("_", " ")}
                        </option>
                    ))}
                </select>
                <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                >
                    <option value="">All departments</option>
                    {options?.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-x-auto rounded-md border mt-10">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Lead</th>
                            <th className="px-4 py-3">Members</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">End date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {!isLoading && data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                    No projects found
                                </td>
                            </tr>
                        )}
                        {data?.map((p) => (
                            <tr key={p.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/admin/projects/${p.id}`}
                                        className="font-medium hover:underline"
                                    >
                                        {p.name}
                                    </Link>
                                    <div className="text-xs text-gray-500">{p.code}</div>
                                </td>
                                <td className="px-4 py-3">{p.department?.name ?? "-"}</td>
                                <td className="px-4 py-3">{p.lead.name}</td>
                                <td className="px-4 py-3">{p._count.members}</td>
                                <td className="px-4 py-3">{p.status.replace("_", " ")}</td>
                                <td className="px-4 py-3">
                                    {p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}