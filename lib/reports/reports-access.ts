import type { Role } from "@/types/rbac";

export type ReportActor = {
  userId: string;
  role: Role;
  departmentId: string | null;
};

export function visibleReportsWhere(a: ReportActor, mineOnly = false) {
  if (a.role === "STAFF" || mineOnly) return { userId: a.userId };
  if (a.role === "TEAM_LEAD") {
    return {
      OR: [
        { userId: a.userId },
        ...(a.departmentId ? [{ departmentId: a.departmentId }] : []),
        { project: { leadId: a.userId } },
      ],
    };
  }
  return {}; 
}

export function canReviewReport(
  a: ReportActor,
  r: {
    userId: string;
    departmentId: string | null;
    user: { role: string };
    project: { leadId: string } | null;
  },
) {
  if (r.userId === a.userId) return false; 
  if (a.role === "ADMIN") return true;
  if (a.role === "TEAM_LEAD") {
    if (r.user.role !== "STAFF") return false;
    return (
      (!!a.departmentId && r.departmentId === a.departmentId) ||
      r.project?.leadId === a.userId
    );
  }
  return false; 
}
