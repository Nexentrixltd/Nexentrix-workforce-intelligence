import { Building2, Users, BriefcaseBusiness, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { DepartmentsTable } from "@/components/admin/departments/DepartmentsTable";
import { Error } from "@/components/shared/Error";
import { AddDepartmentButton } from "@/components/admin/departments/AddDepartmentButton";

export default async function AdminDepartmentsPage() {
  const admin = await requireRole(["ADMIN"]);
  const viewerRole = admin.role

  let data;

  try {
    data = await Promise.all([
      prisma.department.findMany({
        orderBy: [
          { arm: { isShared: "desc" } },
          { arm: { name: "asc" } },
          { name: "asc" },
        ],
        include: {
          arm: { select: { id: true, name: true, isShared: true } },
          teamLead: { select: { id: true, name: true } },
          _count: {
            select: { members: { where: { deactivatedAt: null } } },
          },
        },
      }),
      prisma.user.count({ where: { deactivatedAt: null } }),
      prisma.arm.findMany({
        select: { id: true, name: true },
        orderBy: [{ isShared: "desc" }, { name: "asc" }],
      }),
    ]);
  } catch (error) {
    console.error("[Admin Departments] Failed to fetch department data:", error);
    return <Error heading="Unable to load Departments" />;
  }

  const [departments, totalEmployees, arms] = data;

  const activeDepartments = departments.filter((d) => d.status === "ACTIVE").length;
  const withoutLead = departments.filter((d) => !d.teamLead).length;

  const stats = [
    {
      title: "Total Departments",
      value: departments.length,
      subtitle: "Across all arms",
      icon: Building2,
      iconClass: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Active Departments",
      value: activeDepartments,
      subtitle: "Launched and staffed",
      icon: BriefcaseBusiness,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Without Team Lead",
      value: withoutLead,
      subtitle: "Need a lead assigned",
      icon: UserX,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      title: "Active Members",
      value: totalEmployees,
      subtitle: "Users who can sign in",
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600",
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
  }));

  console.log(data, 'data')
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full md:max-w-7xl space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl tracking-tight font-triakis">Departments</h1>

            <p className="mt-2 text-sm text-secondary">
              Manage departments, their arms, Team Leads and assigned members.
            </p>
          </div>

          <AddDepartmentButton viewerRole={viewerRole} arms={arms} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight">
                      {stat.value.toLocaleString()}
                    </h2>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}
                  >
                    <Icon size={21} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DepartmentsTable
          departments={tableDepartments}
          viewerRole="ADMIN"
          canEdit
          canDelete
          basePath="/admin/departments"
        />
      </div>
    </div>
  );
}