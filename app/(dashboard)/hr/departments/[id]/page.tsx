import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Error as ErrorState } from "@/components/shared/Error";
import { requireRole } from "@/lib/auth/session";
import {
    Avatar,
    RoleBadge,
    StatusBadge,
    formatDate,
} from "@/components/shared/people";

export default async function HrDepartmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireRole(["HR"]);

    const { id } = await params;

    let department;

    try {
        department = await prisma.department.findUnique({
            where: { id },
            select: {
                name: true,
                code: true,
                createdAt: true,
                users: {
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
        console.error("[HR Department Detail] Failed to load:", error);
        return <ErrorState heading="Unable to load Department" />;
    }

    if (!department) notFound();

    const activeCount = department.users.filter((u) => !u.deactivatedAt).length;

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-7">
                <Link
                    href="/hr/departments"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft size={16} /> Back to departments
                </Link>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                            {department.name}
                        </h1>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                            {department.code}
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-secondary">
                        {department.users.length}{" "}
                        {department.users.length === 1 ? "member" : "members"} ({activeCount}{" "}
                        active) · Created {formatDate(department.createdAt.toISOString())}
                    </p>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4 sm:p-5">
                        <h2 className="text-lg font-bold">Members</h2>
                    </div>

                    {department.users.length === 0 ? (
                        <p className="px-6 py-16 text-center text-sm text-slate-500">
                            No one is assigned to this department yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {department.users.map((u) => (
                                <li
                                    key={u.id}
                                    className={`flex flex-wrap items-center gap-3 p-4 sm:px-6 ${u.deactivatedAt ? "opacity-70" : ""
                                        }`}
                                >
                                    <Avatar id={u.id} name={u.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                            {u.name}
                                        </p>
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