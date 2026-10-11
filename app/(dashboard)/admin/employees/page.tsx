import { Users, ShieldCheck, UserCog, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Error as ErrorState } from "@/components/shared/Error";
import { requireRole } from "@/lib/auth/session";
import { EmployeesTable } from "@/components/admin/employees/EmployeesTable";
import { AddEmployeeButton } from "@/components/admin/employees/AddEmployeeButton";

export default async function AdminStaffPage() {
    const admin = await requireRole(["ADMIN"]);

    let data;

    try {
        data = await Promise.all([
            prisma.user.findMany({
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    deactivatedAt: true,
                    department: { select: { id: true, name: true } },
                },
            }),
            prisma.department.findMany({
                orderBy: { name: "asc" },
                select: { id: true, name: true },
            }),
        ]);
    } catch (error) {
        console.error("[Admin Staff] Failed to fetch staff:", error);
        return <ErrorState heading="Unable to load Staff" />;
    }

    const [users, departments] = data;

    const stats = [
        {
            title: "Total Employees",
            value: users.length,
            icon: Users,
            iconClass: "bg-indigo-50 text-indigo-600",
        },
        {
            title: "Admins & HR",
            value: users.filter((u) => u.role === "ADMIN" || u.role === "HR").length,
            icon: ShieldCheck,
            iconClass: "bg-rose-50 text-rose-600",
        },
        {
            title: "Team Leads",
            value: users.filter((u) => u.role === "TEAM_LEAD").length,
            icon: UserCog,
            iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
            title: "No Department",
            value: users.filter((u) => !u.department).length,
            icon: UserX,
            iconClass: "bg-amber-50 text-amber-600",
        },
    ];

    const tableUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        createdAt: u.createdAt.toISOString(),
        deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
    }));

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                            Employees
                        </h1>
                        <p className="mt-2 text-sm text-secondary">
                            View and manage everyone in your organization.
                        </p>
                    </div>

                    <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                        <AddEmployeeButton departments={departments} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.title}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-500">
                                            {stat.title}
                                        </p>
                                        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-3xl">
                                            {stat.value.toLocaleString()}
                                        </h2>
                                    </div>
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${stat.iconClass}`}
                                    >
                                        <Icon size={20} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <EmployeesTable
                    users={tableUsers}
                    departments={departments}
                    currentUserId={admin.id}
                />
            </div>
        </div>
    );
}