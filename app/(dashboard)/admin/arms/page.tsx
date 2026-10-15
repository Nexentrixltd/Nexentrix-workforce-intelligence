import { Network, UserCheck, UserX, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { Error as ErrorState } from "@/components/shared/Error";
import { ArmsList } from "@/components/admin/arm/ArmsList";

export default async function AdminArmsPage() {
    await requireRole(["ADMIN"]);

    let data;

    try {
        data = await Promise.all([
            prisma.arm.findMany({
                orderBy: [{ isShared: "desc" }, { name: "asc" }],
                select: {
                    id: true,
                    name: true,
                    isShared: true,
                    head: { select: { id: true, name: true, email: true } },
                    departments: {
                        orderBy: [{ name: "asc" }],
                        select: {
                            id: true,
                            name: true,
                            status: true,
                            teamLead: { select: { name: true } },
                            _count: { select: { members: { where: { deactivatedAt: null } } } },
                        },
                    },
                },
            }),
            prisma.user.findMany({
                where: {
                    deactivatedAt: null,
                    headOfArm: { is: null },
                    ledDepartments: { none: {} },
                    role: { in: ["STAFF", "TEAM_LEAD", "ARM_HEAD", "CHIEF_OF_STAFF"] },
                },
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: { select: { name: true } },
                },
            }),
        ]);
    } catch (error) {
        console.error("[Admin Arms] Failed to load:", error);
        return <ErrorState heading="Unable to load Arms" />;
    }

    const [arms, candidates] = data;

    const cards = arms.map((a) => ({
        id: a.id,
        name: a.name,
        isShared: a.isShared,
        head: a.head,
        departments: a.departments.map((d) => ({
            id: d.id,
            name: d.name,
            status: d.status,
            leadName: d.teamLead?.name ?? null,
            members: d._count.members,
        })),
    }));

    const headCandidates = candidates.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: c.role,
        departmentName: c.department?.name ?? null,
    }));

    const withHead = arms.filter((a) => a.head).length;
    const totalDepartments = arms.reduce((n, a) => n + a.departments.length, 0);

    const stats = [
        { title: "Arms", value: arms.length, subtitle: "Including shared services", icon: Network, iconClass: "bg-indigo-50 text-indigo-600" },
        { title: "Heads Assigned", value: withHead, subtitle: "Arms with a head", icon: UserCheck, iconClass: "bg-emerald-50 text-emerald-600" },
        { title: "Without a Head", value: arms.length - withHead, subtitle: "Reports have no reviewer", icon: UserX, iconClass: "bg-amber-50 text-amber-600" },
        { title: "Departments", value: totalDepartments, subtitle: "Across all arms", icon: Building2, iconClass: "bg-blue-50 text-blue-600" },
    ];

    return (
        <div className="min-h-screen">
            <div className="mx-auto w-full space-y-7 md:max-w-7xl">
                <div>
                    <h1 className="font-triakis text-4xl tracking-tight">Arms</h1>
                    <p className="mt-2 text-sm text-secondary">
                        Assign the Arm Heads and the Chief of Staff who review each arm&apos;s departments.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                        <h2 className="mt-3 text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</h2>
                                        <p className="mt-1 text-xs text-slate-400">{stat.subtitle}</p>
                                    </div>
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}>
                                        <Icon size={21} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <ArmsList arms={cards} candidates={headCandidates} />
            </div>
        </div>
    );
}