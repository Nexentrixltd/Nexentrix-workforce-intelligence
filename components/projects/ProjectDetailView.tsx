"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    STATUS,
    WEEK_DAYS,
    allocationOptions,
    daysLabel,
    fmtDate,
    initials,
    loadTone,
    toDays,
} from "@/lib/projects/ui";
import { ProjectForm } from "@/components/projects/ProjectForm";
import type { ProjectInput } from "@/lib/validations/project";

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
    canManage: boolean;
    departmentId: string | null;
    canEdit: boolean;
    editScope: "full" | "limited" | null;
};

type Options = { users: { id: string; name: string; role: string }[] };

type Props = {
    projectId: string;
    viewerId: string;
    backHref: string;
    reportHref?: string;
};

async function request(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const e = json.error;
        throw new Error(
            typeof e === "string"
                ? e
                : e
                    ? (Object.values(e)[0] as string[])?.[0]
                    : "Request failed",
        );
    }
    return json;
}

const smallInput =
    "h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-text-primary shadow-sm transition placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

function BackLink({ href }: { href: string }) {
    return (
        <Link
            href={href}
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
    );
}

export function ProjectDetailView({
    projectId,
    viewerId,
    backHref,
    reportHref,
}: Props) {
    const qc = useQueryClient();
    const [newUserId, setNewUserId] = useState("");
    const [editing, setEditing] = useState(false);

    const {
        data: project,
        isLoading,
        isError,
    } = useQuery<Project>({
        queryKey: ["admin-project", projectId],
        queryFn: () => request(`/api/projects/${projectId}`, "GET"),
        retry: false,
    });

    const canManage = !!project?.canManage;

    const { data: options } = useQuery<Options>({
        queryKey: ["admin-project-options"],
        queryFn: () => request("/api/projects/options", "GET"),
        enabled: canManage,
    });

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["admin-project", projectId] });
        qc.invalidateQueries({ queryKey: ["admin-projects"] });
        qc.invalidateQueries({ queryKey: ["my-projects"] });
    };

    const addMember = useMutation({
        mutationFn: (userId: string) =>
            request(`/api/projects/${projectId}/members`, "POST", { userId }),
        onSuccess: () => {
            setNewUserId("");
            toast.success("Member added");
            refresh();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMember = useMutation({
        mutationFn: (v: {
            userId: string;
            roleOnProject?: string | null;
            allocation?: number | null;
        }) => {
            const { userId, ...data } = v;
            return request(
                `/api/projects/${projectId}/members/${userId}`,
                "PATCH",
                data,
            );
        },
        onSuccess: refresh,
        onError: (e: Error) => toast.error(e.message),
    });

    const removeMember = useMutation({
        mutationFn: (userId: string) =>
            request(`/api/projects/${projectId}/members/${userId}`, "DELETE"),
        onSuccess: () => {
            toast.success("Member removed");
            refresh();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    async function saveProject(values: ProjectInput) {
        try {
            await request(`/api/projects/${projectId}`, "PATCH", values);
            toast.success("Project updated");
            setEditing(false);
            refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (isLoading)
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
                <div className="mt-6 h-32 animate-pulse rounded-xl bg-muted" />
            </div>
        );

    if (isError || !project)
        return (
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <p className="text-sm text-muted-foreground">
                    This project doesn&apos;t exist or you don&apos;t have access to it.
                </p>
                <Link
                    href={backHref}
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                    Back to projects
                </Link>
            </div>
        );

    const status = STATUS[project.status] ?? STATUS.PLANNING;
    const isOpen = ["PLANNING", "ACTIVE", "ON_HOLD"].includes(project.status);
    const me = project.members.find((m) => m.userId === viewerId);
    const memberIds = new Set(project.members.map((m) => m.userId));
    const candidates = options?.users.filter((u) => !memberIds.has(u.id)) ?? [];
    const projectDays = toDays(
        project.members.reduce((sum, m) => sum + (m.allocation ?? 0), 0),
    );

    const myLine = me
        ? project.leadId === viewerId
            ? "You lead this project."
            : `You are on this project${me.roleOnProject ? ` as ${me.roleOnProject}` : ""
            }${me.allocation != null
                ? `, ${daysLabel(toDays(me.allocation))} a week`
                : ""
            }.`
        : null;

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <BackLink href={backHref} />

            <div className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
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

                {!editing && (
                    <div className="flex flex-wrap items-center gap-2">
                        {project.canEdit && (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="h-11 rounded-lg border border-border bg-card px-5 text-sm font-medium text-text-primary shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            >
                                Edit project
                            </button>
                        )}
                        {reportHref && me && isOpen && (
                            <Link
                                href={reportHref}
                                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                            >
                                Submit report
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {editing ? (
                <div className="max-w-3xl">
                    <ProjectForm
                        limited={project.editScope === "limited"}
                        submitLabel="Save changes"
                        onSubmit={saveProject}
                        onCancel={() => setEditing(false)}
                        defaultValues={{
                            name: project.name,
                            code: project.code,
                            description: project.description ?? "",
                            status: project.status as ProjectInput["status"],
                            startDate: project.startDate?.slice(0, 10) ?? "",
                            endDate: project.endDate?.slice(0, 10) ?? "",
                            departmentId: project.departmentId ?? "",
                            leadId: project.leadId,
                        }}
                    />
                </div>
            ) : (
                <>
                    <dl className="grid divide-y divide-border rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        {[
                            ["Lead", project.lead.name],
                            ["Department", project.department?.name ?? "None"],
                            ["Starts", fmtDate(project.startDate)],
                            ["Ends", fmtDate(project.endDate)],
                        ].map(([k, v]) => (
                            <div key={k} className="px-5 py-4">
                                <dt className="text-sm text-muted-foreground">{k}</dt>
                                <dd className="mt-1 font-medium text-text-primary">{v}</dd>
                            </div>
                        ))}
                    </dl>

                    {project.description && (
                        <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                            {project.description}
                        </p>
                    )}

                    {myLine && (
                        <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {initials(me!.name)}
                            </span>
                            <p className="text-sm text-text-primary">{myLine}</p>
                        </div>
                    )}

                    <section className="mt-12">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">
                                    Team ({project.members.length})
                                </h2>
                                {canManage && (
                                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                                        Choose how many days a week each person spends on this
                                        project. The last column shows how many of their {WEEK_DAYS}{" "}
                                        days are booked across all projects.
                                    </p>
                                )}
                            </div>
                            {canManage && (
                                <p className="text-sm text-muted-foreground">
                                    {daysLabel(projectDays)} a week in total on this project
                                </p>
                            )}
                        </div>

                        {canManage && (
                            <div className="mt-5 flex gap-2">
                                <select
                                    value={newUserId}
                                    onChange={(e) => setNewUserId(e.target.value)}
                                    className="h-11 flex-1 rounded-lg border border-border bg-card px-3.5 text-sm text-text-primary shadow-sm transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">Select a person to add</option>
                                    {candidates.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role.replace("_", " ").toLowerCase()})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    disabled={!newUserId || addMember.isPending}
                                    onClick={() => addMember.mutate(newUserId)}
                                    className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-50"
                                >
                                    {addMember.isPending ? "Adding..." : "Add member"}
                                </button>
                            </div>
                        )}

                        {canManage ? (
                            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                                <table className="w-full min-w-170 text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs text-muted-foreground">
                                            <th className="px-5 py-3 font-medium">Person</th>
                                            <th className="px-5 py-3 font-medium">Role on project</th>
                                            <th className="px-5 py-3 font-medium">Time on project</th>
                                            <th className="px-5 py-3 font-medium">
                                                Days booked in total
                                            </th>
                                            <th className="px-5 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.members.map((m) => {
                                            const isLead = m.userId === project.leadId;
                                            const totalDays =
                                                m.totalAllocation != null
                                                    ? toDays(m.totalAllocation)
                                                    : null;
                                            const tone =
                                                totalDays != null ? loadTone(totalDays) : null;
                                            return (
                                                <tr key={m.id} className="align-middle">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                                {initials(m.name)}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-text-primary">
                                                                    {m.name}
                                                                    {isLead && (
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

                                                    <td className="px-5 py-4">
                                                        <input
                                                            key={`${m.id}-${m.roleOnProject}`}
                                                            defaultValue={m.roleOnProject ?? ""}
                                                            placeholder="Add a role"
                                                            onBlur={(e) => {
                                                                const v = e.target.value.trim();
                                                                if (v !== (m.roleOnProject ?? ""))
                                                                    updateMember.mutate({
                                                                        userId: m.userId,
                                                                        roleOnProject: v || null,
                                                                    });
                                                            }}
                                                            className={`${smallInput} w-44`}
                                                        />
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <select
                                                            value={m.allocation ?? ""}
                                                            onChange={(e) =>
                                                                updateMember.mutate({
                                                                    userId: m.userId,
                                                                    allocation:
                                                                        e.target.value === ""
                                                                            ? null
                                                                            : Number(e.target.value),
                                                                })
                                                            }
                                                            className={`${smallInput} w-44`}
                                                        >
                                                            <option value="">Not set</option>
                                                            {allocationOptions(m.allocation).map((o) => (
                                                                <option key={o.value} value={o.value}>
                                                                    {o.label}
                                                                </option>
                                                            ))}
                                                        </select>
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
                                                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
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

                                                    <td className="px-5 py-4 text-right">
                                                        {!isLead && (
                                                            <button
                                                                onClick={() => removeMember.mutate(m.userId)}
                                                                className="rounded-md px-2 py-1 text-sm text-red-600 transition hover:bg-red-500/10"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                                {project.members.map((m) => (
                                    <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                            {initials(m.name)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-text-primary">
                                                {m.name}
                                                {m.userId === project.leadId && (
                                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                        Lead
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {m.roleOnProject || "Team member"}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}