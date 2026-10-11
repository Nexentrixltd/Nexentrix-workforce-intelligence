import {
  Building2,
  Users,
  BriefcaseBusiness,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DepartmentsTable } from "@/components/admin/departments/DepartmentsTable";
import { Error } from "@/components/shared/Error";
import { AddDepartmentButton } from "@/components/admin/departments/AddDepartmentButton";

export default async function AdminDepartmentsPage() {
  let data;

  try {
    data =
      await Promise.all([
        prisma.department.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            _count: {
              select: {
                users: true,
              },
            },
          },
        }),

        prisma.department.count(),

        prisma.user.count(),
      ]);
  } catch (error) {
    console.error("[Admin Departments] Failed to fetch department data:", error);
    return <Error heading="Unable to load Departments" />;
  }

  const [departments, totalDepartments, totalUsers] = data;

  const averageTeamSize =
    totalDepartments > 0
      ? Math.round(totalUsers / totalDepartments)
      : 0;

  const stats = [
    {
      title: "Total Departments",
      value: totalDepartments,
      subtitle: "Registered departments",
      icon: Building2,
      iconClass: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Total Members",
      value: totalUsers,
      subtitle: "Registered users",
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      title: "Departments With Members",
      value: departments.filter(
        (department) => department._count.users > 0
      ).length,
      subtitle: "Departments with assigned users",
      icon: BriefcaseBusiness,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Average Team Size",
      value: averageTeamSize,
      subtitle: "Users per department",
      icon: ArrowUpRight,
      iconClass: "bg-amber-50 text-amber-600",
    },
  ];

  const tableDepartments = departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    members: department._count.users,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString()
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full md:max-w-7xl space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl tracking-tight font-triakis">
              Departments
            </h1>

            <p className="mt-2 text-sm text-secondary">
              Manage departments, department codes, and assigned members.
            </p>
          </div>

         <AddDepartmentButton />
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
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>

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

        <DepartmentsTable departments={tableDepartments} />
      </div>
    </div>
  );
}
