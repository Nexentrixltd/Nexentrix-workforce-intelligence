import { Actor } from "../project-access";

export function visibleReportsWhere(
  a: Actor & { departmentId: string | null },
  mineOnly = false,
) {
  if (a.role === "STAFF" || mineOnly) return { userId: a.userId };
  if (a.role === "TEAM_LEAD") {
    return a.departmentId
      ? { OR: [{ userId: a.userId }, { departmentId: a.departmentId }] }
      : { userId: a.userId };
  }
  return {}; 
}
