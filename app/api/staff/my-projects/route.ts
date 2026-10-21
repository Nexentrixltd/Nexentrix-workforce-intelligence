import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { projectHref } from "@/lib/notifications";

const IN_PROGRESS = ["PLANNING", "ACTIVE", "ON_HOLD"] as const;

export async function GET() {
  const auth = await requireApiRole(["STAFF"]);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const rows = await prisma.projectMember.findMany({
    where: {
      userId: user.id,
      project: { status: { in: [...IN_PROGRESS] } },
    },
    select: {
      allocation: true,
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          leadId: true,
        },
      },
    },
    orderBy: { project: { name: "asc" } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.project.id,
      name: r.project.name,
      code: r.project.code,
      status: r.project.status,
      isLead: r.project.leadId === user.id,
      allocation: r.allocation ?? 0,
      href: projectHref(user.role, r.project.id),
    })),
  );
}
