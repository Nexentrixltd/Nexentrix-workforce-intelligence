import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

const IN_PROGRESS = ["PLANNING", "ACTIVE", "ON_HOLD"] as const;

export async function GET() {
  const auth = await requireApiRole(["ADMIN", "HR"]);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { role: { in: ["TEAM_LEAD", "STAFF"] } },
    select: {
      id: true,
      name: true,
      role: true,
      department: { select: { name: true } },
      projectMembers: {
        where: { project: { status: { in: [...IN_PROGRESS] } } },
        select: {
          allocation: true,
          project: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      department: u.department?.name ?? null,
      totalAllocation: u.projectMembers.reduce(
        (sum, pm) => sum + (pm.allocation ?? 0),
        0,
      ),
      projects: u.projectMembers.map((pm) => ({
        id: pm.project.id,
        name: pm.project.name,
        code: pm.project.code,
        allocation: pm.allocation,
      })),
    })),
  );
}
