import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { PROJECT_ROLES, forbidden } from "@/lib/project-access";

export async function GET() {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;

  if (role === "STAFF") {
    const leads = await prisma.project.count({ where: { leadId: id } });
    if (leads === 0) return forbidden();
  }

  const [departments, users] = await Promise.all([
    role === "STAFF"
      ? Promise.resolve([])
      : prisma.department.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    prisma.user.findMany({
      where: { role: { in: ["TEAM_LEAD", "STAFF"] }, deactivatedAt: null },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ departments, users });
}
