import { Users, UserCheck, UserX, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { EmployeesTable } from "@/components/admin/employees/EmployeesTable";
import { AddEmployeeButton } from "@/components/admin/employees/AddEmployeeButton";
import { StatGrid } from "@/components/shared/statGrid";
import { Error as ErrorState } from "@/components/shared/Error";
import { Role, ROLES } from "@/types/rbac";
import { canAssignRole } from "@/lib/permissions";

export default async function HrEmployeesPage() {
    const hr = await requireRole(["HR"]);
    const viewerRole = hr.role as Role;

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
        console.error("[HR Employees] Failed to load:", error);
        return <ErrorState heading="Unable to load Employees" />;
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
            title: "Active",
            value: users.filter((u) => !u.deactivatedAt).length,
            icon: UserCheck,
            iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
            title: "Inactive",
            value: users.filter((u) => u.deactivatedAt).length,
            icon: UserX,
            iconClass: "bg-amber-50 text-amber-600",
        },
        {
            title: "No Department",
            value: users.filter((u) => !u.department).length,
            icon: Building2,
            iconClass: "bg-sky-50 text-sky-600",
        },
    ];

    const rows = users.map((u) => ({
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
                            Manage staff and team lead accounts, departments and status.
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

                <StatGrid stats={stats} />

                <EmployeesTable
                    users={rows}
                    departments={departments}
                    currentUserId={hr.id}
                    viewerRole="HR"
                />
            </div>
        </div>
    );
}