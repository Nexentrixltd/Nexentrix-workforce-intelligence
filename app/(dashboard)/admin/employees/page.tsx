import { Users, ShieldCheck, UserCog, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Error as ErrorState } from "@/components/shared/Error";
import { requireRole } from "@/lib/auth/session";
import { EmployeesTable } from "@/components/admin/employees/EmployeesTable";
import { AddEmployeeButton } from "@/components/admin/employees/AddEmployeeButton";
import { Role, ROLES } from "@/types/rbac";
import { canAssignRole } from "@/lib/permissions";
import StatCard from "@/components/shared/StatCard";

export default async function AdminStaffPage() {
    const admin = await requireRole(["ADMIN"]);
    const viewerRole = admin.role as Role;

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
                select: { id: true, name: true, teamLeadId: true, },
            }),
            prisma.arm.findMany({
                select: { id: true, name: true, isShared: true, headId: true },
                orderBy: [{ isShared: "desc" }, { name: "asc" }],
            }),
        ]);
    } catch (error) {
        console.error("[Admin Staff] Failed to fetch staff:", error);
        return <ErrorState heading="Unable to load Staff" />;
    }

    const [users, departments, arms] = data;

    const departmentOptions = departments.map((d) => ({
        id: d.id,
        name: d.name,
        hasLead: !!d.teamLeadId,
    }));

    const armOptions = arms.map((a) => ({
        id: a.id,
        name: a.name,
        isShared: a.isShared,
        hasHead: !!a.headId,
    }));

    const allowedRoles = ROLES.filter((r) => canAssignRole(viewerRole, r));

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
                        <p className="mt-2 text-sm text-muted-foreground">
                            View and manage everyone in your organization.
                        </p>
                    </div>

                    <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                        <AddEmployeeButton
                            departments={departmentOptions}
                            arms={armOptions}
                            allowedRoles={allowedRoles}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    {stats.map((stat, i) => (
                        <StatCard stat={stat} key={i} />
                    ))}
                </div>

                <EmployeesTable
                    users={tableUsers}
                    departments={departments}
                    currentUserId={admin.id}
                    viewerRole="ADMIN"
                />
            </div>
        </div>
    );
}