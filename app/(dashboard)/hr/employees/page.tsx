import { Users, UserCheck, UserX, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { Error as ErrorState } from "@/components/shared/Error";
import { StatGrid } from "@/components/shared/statGrid";
import { EmployeesTable } from "@/components/hr/EmployeesTable";

export default async function HrEmployeesPage() {
    await requireRole(["HR"]);

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
        console.error("[HR Employees] Failed to load:", error);
        return <ErrorState heading="Unable to load Employees" />;
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
                <div className="min-w-0">
                    <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                        Employees
                    </h1>
                    <p className="mt-2 text-sm text-secondary">
                        Browse everyone in the organization by role, department and status.
                    </p>
                </div>

                <StatGrid stats={stats} />

                <EmployeesTable users={rows} departments={departments} />
            </div>
        </div>
    );
}