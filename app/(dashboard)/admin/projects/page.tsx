"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PROJECT_STATUSES } from "@/lib/validations/project";
import { useUserStore } from "@/store/userStore";
import { Role } from "@/types/rbac";
import { ProjectsList } from "@/components/projects/ProjectList";

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

    const { data: options } = useQuery<{
        departments: { id: string; name: string }[];
    }>({
        queryKey: ["admin-project-options"],
        queryFn: async () => {
            const res = await fetch("/api/projects/options");
            return res.ok ? res.json() : { departments: [] };
        },
    });

    // const { data, isLoading } = useQuery<Row[]>({
    //     queryKey: ["admin-projects", q, status, departmentId],
    //     queryFn: async () => {
    //         const params = new URLSearchParams();
    //         if (q) params.set("q", q);
    //         if (status) params.set("status", status);
    //         if (departmentId) params.set("departmentId", departmentId);
    //         const res = await fetch(`/api/projects?${params}`);
    //         if (!res.ok) throw new Error("Failed to load projects");
    //         return res.json();
    //     },
    // });

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                        Projects
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {user?.role ? SUBTITLES[user.role] : ""}
                    </p>
                </div>

                <Link
                    href="/admin/projects/new"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium"
                >
                    New project
                </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-10">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name or code"
                    className="rounded-md bg-muted border px-3 py-2 text-sm"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-md border bg-muted px-3 py-2 text-sm"
                >
                    <option value="">All statuses</option>
                    {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s.replace("_", " ")}
                        </option>
                    ))}
                </select>
                {options?.departments && options.departments.length > 0 && (
                    <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="rounded-md border bg-muted px-3 py-2 text-sm"
                    >
                        <option value="">All departments</option>
                        {options.departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <ProjectsList basePath="/admin/projects" canCreate />
        </div>
    );
}