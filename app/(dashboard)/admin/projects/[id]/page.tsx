"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectForm } from "@/components/projects/ProjectForm";
import type { ProjectInput } from "@/lib/validations/project";

type Member = {
  id: string;
  userId: string;
  name: string;
  role: string;
  roleOnProject: string | null;
  allocation: number | null; // stored as % (20 = 1 day a week)
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
  departmentId: string | null;
  leadId: string;
  department: { name: string } | null;
  lead: { name: string };
  members: Member[];
};

type Options = {
  users: { id: string; name: string; role: string }[];
};

const STATUS: Record<string, { label: string; pill: string; dot: string }> = {
  PLANNING: {
    label: "Planning",
    pill: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  ACTIVE: {
    label: "Active",
    pill: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  ON_HOLD: {
    label: "On hold",
    pill: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    label: "Completed",
    pill: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

// 1 working day a week = 20% of a 5-day week
const PERCENT_PER_DAY = 20;
const WEEK_DAYS = 5;

const toDays = (pct: number) => Number((pct / PERCENT_PER_DAY).toFixed(1));
const daysLabel = (d: number) => `${d} day${d === 1 ? "" : "s"}`;

const DAY_PRESETS: { value: number; label: string }[] = [
  { value: 20, label: "1 day a week" },
  { value: 40, label: "2 days a week" },
  { value: 60, label: "3 days a week" },
  { value: 80, label: "4 days a week" },
  { value: 100, label: "Full time (5 days)" },
];

function optionsFor(current: number | null) {
  if (current == null || DAY_PRESETS.some((p) => p.value === current))
    return DAY_PRESETS;
  return [
    ...DAY_PRESETS,
    { value: current, label: `${daysLabel(toDays(current))} a week` },
  ].sort((a, b) => a.value - b.value);
}

function loadTone(days: number) {
  if (days > WEEK_DAYS) return { bar: "bg-red-500", text: "text-red-600" };
  if (days > WEEK_DAYS * 0.8)
    return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-muted" };
}

function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

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
  "h-9 rounded-lg bg-muted border border-border px-2.5 text-sm shadow-sm transition hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newUserId, setNewUserId] = useState("");

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["admin-project", id],
    queryFn: () => request(`/api/projects/${id}`, "GET"),
  });

  const { data: options } = useQuery<Options>({
    queryKey: ["admin-project-options"],
    queryFn: () => request("/api/projects/options", "GET"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-project", id] });
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  };

  const addMember = useMutation({
    mutationFn: (userId: string) =>
      request(`/api/projects/${id}/members`, "POST", { userId }),
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
      return request(`/api/projects/${id}/members/${userId}`, "PATCH", data);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      request(`/api/projects/${id}/members/${userId}`, "DELETE"),
    onSuccess: () => {
      toast.success("Member removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveProject(values: ProjectInput) {
    try {
      await request(`/api/projects/${id}`, "PATCH", values);
      toast.success("Project updated");
      setEditing(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteProject() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await request(`/api/projects/${id}`, "DELETE");
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
      router.push("/admin/projects");
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

  if (!project)
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/admin/projects"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to projects
        </Link>
      </div>
    );

  const status = STATUS[project.status] ?? STATUS.PLANNING;
  const memberIds = new Set(project.members.map((m) => m.userId));
  const candidates = options?.users.filter((u) => !memberIds.has(u.id)) ?? [];
  const projectDays = toDays(
    project.members.reduce((sum, m) => sum + (m.allocation ?? 0), 0),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/projects"
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
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
            >
              Edit project
            </button>
            <button
              onClick={deleteProject}
              className="h-10 rounded-lg px-4 text-sm font-medium text-red-600 transition hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mx-auto max-w-3xl">
          <ProjectForm
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
          <section>
            <dl className="grid divide-y divide-border rounded-xl border border-border bg-muted sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {[
                ["Lead", project.lead.name],
                ["Department", project.department?.name ?? "None"],
                ["Starts", fmtDate(project.startDate)],
                ["Ends", fmtDate(project.endDate)],
              ].map(([k, val]) => (
                <div key={k} className="px-5 py-4">
                  <dt className="text-base text-muted-foreground">{k}</dt>
                  <dd className="mt-1 font-medium text-text-primary">{val}</dd>
                </div>
              ))}
            </dl>

            {project.description && (
              <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}
          </section>

          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Team ({project.members.length})
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Choose how many days a week each person spends on this
                  project. The last column shows how many of their {WEEK_DAYS}{" "}
                  days are booked across all projects.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {daysLabel(projectDays)} a week in total on this project
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="h-11 flex-1 rounded-lg bg-muted px-3.5 text-sm shadow-sm transition hover:border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
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
                className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-text-primary shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-50"
              >
                {addMember.isPending ? "Adding..." : "Add member"}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted">
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
                            {optionsFor(m.allocation).map((o) => (
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
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted-foreground">
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
                              className="rounded-md px-2 py-1 text-sm text-red-600 transition hover:bg-red-50"
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
          </section>
        </>
      )}
    </div>
  );
}