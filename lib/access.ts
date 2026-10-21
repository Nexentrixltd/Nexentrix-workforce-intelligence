import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

type Actor = Pick<SessionUser, "id" | "role" | "departmentId">;

export async function visibleDepartmentIds(
  actor: Actor,
): Promise<string[] | null> {
  switch (actor.role) {
    case "ADMIN":
    case "EXECUTIVE":
    case "HR":
      return null;

    case "CHIEF_OF_STAFF":
    case "ARM_HEAD": {
      const departments = await prisma.department.findMany({
        where: { arm: { headId: actor.id } },
        select: { id: true },
      });
      return departments.map((d) => d.id);
    }

    case "TEAM_LEAD": {
      const departments = await prisma.department.findMany({
        where: { teamLeadId: actor.id },
        select: { id: true },
      });
      return departments.map((d) => d.id);
    }

    default:
      return actor.departmentId ? [actor.departmentId] : [];
  }
}

export async function userScope(actor: Actor): Promise<Prisma.UserWhereInput> {
  const ids = await visibleDepartmentIds(actor);
  return {
    deactivatedAt: null,
    ...(ids === null ? {} : { departmentId: { in: ids } }),
  };
}

export async function departmentScope(
  actor: Actor,
): Promise<Prisma.DepartmentWhereInput> {
  const ids = await visibleDepartmentIds(actor);
  return ids === null ? {} : { id: { in: ids } };
}

export async function canAccessDepartment(
  actor: Actor,
  departmentId: string,
): Promise<boolean> {
  const ids = await visibleDepartmentIds(actor);
  return ids === null || ids.includes(departmentId);
}

export async function approversFor(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      department: {
        select: { teamLeadId: true, arm: { select: { headId: true } } },
      },
    },
  });
  return {
    teamLeadId: u?.department?.teamLeadId ?? null,
    reviewerId: u?.department?.arm.headId ?? null,
  };
}
