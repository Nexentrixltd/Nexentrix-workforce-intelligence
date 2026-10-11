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
  | "CREATE_DEPARTMENT"
  | "EDIT_DEPARTMENT"
  | "DELETE_DEPARTMENT"
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

export const roleRoutes: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  HR: "/hr/dashboard",
  TEAM_LEAD: "/team-lead/dashboard",
  STAFF: "/staff/dashboard",
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "VIEW_ADMIN_DASHBOARD",
    "VIEW_USERS",
    "CREATE_USER",
    "EDIT_USER",
    "DEACTIVATE_USER",
    "RESET_USER_PASSWORD",
    "REVOKE_USER_SESSIONS",
    "VIEW_DEPARTMENTS",
    "CREATE_DEPARTMENT",
    "EDIT_DEPARTMENT",
    "DELETE_DEPARTMENT",
    "VIEW_ALL_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_ANALYTICS",
    "MANAGE_SETTINGS",
  ],
  HR: [
    "VIEW_HR_DASHBOARD",
    "VIEW_USERS",
    "CREATE_USER",
    "EDIT_USER",
    "DEACTIVATE_USER",
    "RESET_USER_PASSWORD",
    "REVOKE_USER_SESSIONS",
    "VIEW_DEPARTMENTS",
    "CREATE_DEPARTMENT",
    "EDIT_DEPARTMENT",
    "VIEW_ALL_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_ANALYTICS",
  ],
  STAFF: [
    "VIEW_STAFF_DASHBOARD",
    "VIEW_OWN_REPORTS",
    "SUBMIT_REPORT",
    "EDIT_OWN_REPORT",
  ],
  TEAM_LEAD: [
    "VIEW_TEAM_LEAD_DASHBOARD",
    "VIEW_TEAM_REPORTS",
    "APPROVE_REPORT",
    "VIEW_ANALYTICS",
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
