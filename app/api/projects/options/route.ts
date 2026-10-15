import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorized, forbidden, Actor } from "@/lib/project-access";
import { Role } from "@/types/rbac";
import { requireApiRole } from "@/lib/auth/session";

const PROJECT_ROLES: Role[] = ["ADMIN", "HR", "TEAM_LEAD"];

export async function GET() {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  if (actor.role === "STAFF") return forbidden();

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["TEAM_LEAD", "STAFF"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ departments, users });
};
