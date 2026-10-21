import { Network, UserCheck, UserX, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { Error as ErrorState } from "@/components/shared/Error";
import { ArmCard, ArmsList } from "@/components/arm/ArmsList";
import StatCard from "@/components/shared/StatCard";

export default async function AdminArmsPage() {
    await requireRole(["HR"]);

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

    const armCards: ArmCard[] = arms.map((arm) => ({
        id: arm.id,
        name: arm.name,
        isShared: arm.isShared,
        head: arm.head,
        departments: arm.departments.map((d) => ({
            id: d.id,
            name: d.name,
            status: d.status as "ACTIVE" | "PLANNED",
            leadName: d.teamLead?.name ?? null,
            members: d._count.members,
        })),
    }));

    return (
        <div className="min-h-screen">
            <div className="mx-auto w-full space-y-7 md:max-w-7xl">
                <div>
                    <h1 className="font-triakis text-4xl tracking-tight">Arms</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Assign the Arm Heads and the Chief of Staff who review each arm&apos;s departments.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat, i) => (
                        <StatCard stat={stat} key={i} />
                    ))}
                </div>

                <ArmsList arms={armCards} candidates={[]} readOnly />
            </div>
        </div>
    );
}