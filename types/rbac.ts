export type Role = "ADMIN" | "HR" | "STAFF" | "TEAM_LEAD";

export type Permission =
  | "VIEW_ADMIN_DASHBOARD"
  | "VIEW_HR_DASHBOARD"
  | "VIEW_STAFF_DASHBOARD"
  | "VIEW_TEAM_LEAD_DASHBOARD"
  | "VIEW_USERS"
  | "CREATE_USER"
  | "EDIT_USER"
  | "DEACTIVATE_USER"
  | "RESET_USER_PASSWORD"
  | "REVOKE_USER_SESSIONS"
  | "VIEW_DEPARTMENTS"
  | "MANAGE_DEPARTMENTS"
  | "VIEW_ALL_REPORTS"
  | "VIEW_OWN_REPORTS"
  | "VIEW_TEAM_REPORTS"
  | "SUBMIT_REPORT"
  | "EDIT_OWN_REPORT"
  | "APPROVE_REPORT"
  | "EXPORT_REPORTS"
  | "VIEW_ANALYTICS"
  | "MANAGE_SETTINGS";


export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["ADMIN", "HR", "STAFF", "TEAM_LEAD"],

  "/dashboard/admin": ["ADMIN"],
  "/dashboard/hr": ["HR"],
  "/dashboard/staff": ["STAFF"],
  "/dashboard/team-lead": ["TEAM_LEAD"],

  "/dashboard/reports": ["ADMIN", "HR", "TEAM_LEAD"],
  "/dashboard/users": ["ADMIN"],
  "/dashboard/settings": ["ADMIN"],
  "/dashboard/approvals": ["TEAM_LEAD"],
};
