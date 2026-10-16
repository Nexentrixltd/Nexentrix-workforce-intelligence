import { Building2, Users, UserX, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { DepartmentsTable } from "@/components/admin/departments/DepartmentsTable";
import { AddDepartmentButton } from "@/components/admin/departments/AddDepartmentButton";
import { hasPermission, Role } from "@/types/rbac";
import { Error as ErrorState } from "@/components/shared/Error";
import { StatGrid } from "@/components/shared/statGrid";

export default async function HrDepartmentsPage() {
    const hr = await requireRole(["HR"]);
    const role = hr.role as Role;

    const canCreate = hasPermission(role, "CREATE_DEPARTMENT");
    const canEdit = hasPermission(role, "EDIT_DEPARTMENT");
    const canDelete = hasPermission(role, "DELETE_DEPARTMENT");

    let data;

    try {
        data = await Promise.all([
            prisma.department.findMany({
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    focus: true,
                    status: true,
                    arm: { select: { id: true, name: true, isShared: true } },
                    teamLead: { select: { id: true, name: true } },
                    createdAt: true,
                    _count: { select: { members: true } },
                },
            }),
            prisma.user.count({ where: { departmentId: null } }),
            prisma.arm.findMany({
                select: { id: true, name: true },
                orderBy: [{ isShared: "desc" }, { name: "asc" }],
            }),
        ]);
    } catch (error) {
        console.error("[HR Departments] Failed to load:", error);
        return <ErrorState heading="Unable to load Departments" />;
    }

    const [departments, unassigned, arms] = data;
    const counts = departments.map((d) => d._count.members);

    const stats = [
        {
            title: "Total Departments",
            value: departments.length,
            icon: Building2,
            iconClass: "bg-indigo-50 text-indigo-600",
        },
        {
            title: "Assigned Employees",
            value: counts.reduce((sum, n) => sum + n, 0),
            icon: Users,
            iconClass: "bg-blue-50 text-blue-600",
        },
        {
            title: "Unassigned Employees",
            value: unassigned,
            icon: UserX,
            iconClass: "bg-amber-50 text-amber-600",
        },
        {
            title: "Largest Team",
            value: Math.max(0, ...counts),
            icon: TrendingUp,
            iconClass: "bg-emerald-50 text-emerald-600",
        },
    ];

    const tableDepartments = departments.map((department) => ({
        id: department.id,
        name: department.name,
        slug: department.slug,
        focus: department.focus,
        status: department.status,
        armId: department.arm.id,
        armName: department.arm.name,
        teamLead: department.teamLead
            ? { id: department.teamLead.id, name: department.teamLead.name }
            : null,
        members: department._count.members,
        createdAt: department.createdAt.toISOString(),
    }));

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                            Departments
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create departments and manage who sits in each one.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                            <AddDepartmentButton viewerRole={role} arms={arms} />
                        </div>
                    )}
                </div>

                <StatGrid stats={stats} />

                <DepartmentsTable
                    departments={tableDepartments}
                    viewerRole="HR"
                    canEdit={canEdit}
                    canDelete={canDelete}
                    basePath="/hr/departments"
                />
            </div>
        </div>
    );
}