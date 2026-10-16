"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    STATUS,
    WEEK_DAYS,
    daysLabel,
    fmtDate,
    initials,
    loadTone,
    toDays,
} from "@/lib/projects/ui";

type Member = {
    id: string;
    userId: string;
    name: string;
    role: string;
    roleOnProject: string | null;
    allocation: number | null;
    totalAllocation: number | null;
};

type Project = {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    leadId: string;
    department: { name: string } | null;
    lead: { name: string };
    members: Member[];
};

export default function HrProjectDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: project, isLoading } = useQuery<Project>({
        queryKey: ["admin-project", id],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${id}`);
            if (!res.ok) throw new Error("Not found");
            return res.json();
        },
    });

    if (isLoading)
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100" />
                <div className="mt-6 h-32 animate-pulse rounded-xl bg-gray-100" />
            </div>
        );

    if (!project)
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <p className="text-sm text-muted-foreground">This project doesn&apos;t exist.</p>
                <Link
                    href="/hr/projects"
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                    Back to projects
                </Link>
            </div>
        );

    const status = STATUS[project.status] ?? STATUS.PLANNING;
    const projectDays = toDays(
        project.members.reduce((sum, m) => sum + (m.allocation ?? 0), 0),
    );

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link
                href="/hr/projects"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
                Back to projects
            </Link>

            <div className="mb-8 mt-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                        {project.name}
                    </h1>
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${status.pill}`}
                    >
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        {status.label}
                    </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{project.code}</p>
            </div>

            <dl className="grid divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                {[
                    ["Lead", project.lead.name],
                    ["Department", project.department?.name ?? "None"],
                    ["Starts", fmtDate(project.startDate)],
                    ["Ends", fmtDate(project.endDate)],
                ].map(([k, v]) => (
                    <div key={k} className="px-5 py-4">
                        <dt className="text-sm text-muted-foreground">{k}</dt>
                        <dd className="mt-1 font-medium text-gray-900">{v}</dd>
                    </div>
                ))}
            </dl>

            {project.description && (
                <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {project.description}
                </p>
            )}

            <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Team ({project.members.length})
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {daysLabel(projectDays)} a week in total on this project
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full min-w-160 text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 text-xs text-muted-foreground">
                                <th className="px-5 py-3 font-medium">Person</th>
                                <th className="px-5 py-3 font-medium">Role on project</th>
                                <th className="px-5 py-3 font-medium">Time on project</th>
                                <th className="px-5 py-3 font-medium">Days booked in total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {project.members.map((m) => {
                                const totalDays =
                                    m.totalAllocation != null ? toDays(m.totalAllocation) : null;
                                const tone = totalDays != null ? loadTone(totalDays) : null;
                                return (
                                    <tr key={m.id} className="align-middle">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                    {initials(m.name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-gray-900">
                                                        {m.name}
                                                        {m.userId === project.leadId && (
                                                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                                Lead
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {m.role.replace("_", " ").toLowerCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">
                                            {m.roleOnProject || "Not set"}
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">
                                            {m.allocation != null
                                                ? `${daysLabel(toDays(m.allocation))} a week`
                                                : "Not set"}
                                        </td>
                                        <td className="px-5 py-4">
                                            {totalDays != null && tone ? (
                                                <div className="w-40">
                                                    <div className="flex items-baseline justify-between text-xs">
                                                        <span className={`font-medium ${tone.text}`}>
                                                            {totalDays} of {WEEK_DAYS} days
                                                        </span>
                                                        {totalDays > WEEK_DAYS && (
                                                            <span className="font-medium text-red-600">
                                                                Overbooked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                                        <div
                                                            className={`h-full rounded-full ${tone.bar}`}
                                                            style={{
                                                                width: `${Math.min((totalDays / WEEK_DAYS) * 100, 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}