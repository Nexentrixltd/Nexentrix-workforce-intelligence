import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Error as ErrorState } from "@/components/shared/Error";
import {
    Avatar,
    RoleBadge,
    StatusBadge,
    formatDate,
} from "@/components/shared/people";
import { EditDepartmentButton } from "@/components/admin/departments/EditDepartmentButton";
import { Role } from "@/types/rbac";

type Props = {
    id: string;
    basePath: string;
    viewerRole: Role;
    canEdit: boolean;
};

export async function DepartmentDetail({ id, basePath, viewerRole, canEdit }: Props) {
    let department;

    try {
        department = await prisma.department.findUnique({
            where: { id },
            select: {
                name: true,
                focus: true,
                status: true,
                teamLeadId: true,
                createdAt: true,
                arm: { select: { name: true } },
                teamLead: { select: { name: true } },
                members: {
                    orderBy: { name: "asc" },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        deactivatedAt: true,
                    },
                },
            },
        });
    } catch (error) {
        console.error("[Department Detail] Failed to load:", error);
        return <ErrorState heading="Unable to load Department" />;
    }

    if (!department) notFound();

    const activeCount = department.members.filter((u) => !u.deactivatedAt).length;
    const active = department.status === "ACTIVE";

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-7">
                <Link
                    href={basePath}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft size={16} /> Back to departments
                </Link>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                                {department.name}
                            </h1>
                            <span
                                className={`rounded-md px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                                    }`}
                            >
                                {active ? "Active" : "Planned"}
                            </span>
                            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                {department.arm.name}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-col items-start gap-1">
                            {department.focus && <p className="text-base">{department.focus}</p>}
                            <p className="text-sm text-muted-foreground">
                                Team Lead:{" "}
                                {department.teamLead ? (
                                    <span className="font-medium text-slate-800">{department.teamLead.name}</span>
                                ) : (
                                    <span className="italic text-slate-400">Unassigned</span>
                                )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {department.members.length}{" "}
                                {department.members.length === 1 ? "member" : "members"} ({activeCount} active) ·
                                Created {formatDate(department.createdAt.toISOString())}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                            <EditDepartmentButton
                                department={{
                                    id,
                                    name: department.name,
                                    focus: department.focus,
                                    status: department.status,
                                    teamLeadId: department.teamLeadId,
                                }}
                                viewerRole={viewerRole}
                            />
                        </div>
                    )}
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4 sm:p-5">
                        <h2 className="text-lg font-bold">Members</h2>
                    </div>

                    {department.members.length === 0 ? (
                        <p className="px-6 py-16 text-center text-sm text-slate-500">
                            No one is assigned to this department yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {department.members.map((u) => (
                                <li
                                    key={u.id}
                                    className={`flex flex-wrap items-center gap-3 p-4 sm:px-6 ${u.deactivatedAt ? "opacity-70" : ""
                                        }`}
                                >
                                    <Avatar id={u.id} name={u.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
                                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RoleBadge role={u.role} />
                                        <StatusBadge inactive={!!u.deactivatedAt} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}