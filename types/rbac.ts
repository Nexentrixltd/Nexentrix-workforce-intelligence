export const ROLES = [
  "ADMIN",
  "EXECUTIVE",
  "CHIEF_OF_STAFF",
  "ARM_HEAD",
  "HR",
  "TEAM_LEAD",
  "STAFF",
] as const;

export type Role = (typeof ROLES)[number];

export type Permission =
  | "VIEW_ADMIN_DASHBOARD"
  | "VIEW_EXECUTIVE_DASHBOARD"
  | "VIEW_CHIEF_OF_STAFF_DASHBOARD"
  | "VIEW_ARM_HEAD_DASHBOARD"
  | "VIEW_HR_DASHBOARD"
  | "VIEW_STAFF_DASHBOARD"
  | "VIEW_TEAM_LEAD_DASHBOARD"
  | "VIEW_USERS"
  | "VIEW_SCOPED_USERS"
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
  | "REVIEW_REPORT"
  | "EXPORT_REPORTS"
  | "VIEW_ANALYTICS"
  | "MANAGE_SETTINGS";

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": [...ROLES],

  "/dashboard/admin": ["ADMIN"],
  "/dashboard/executive": ["EXECUTIVE"],
  "/dashboard/chief-of-staff": ["CHIEF_OF_STAFF"],
  "/dashboard/arm-head": ["ARM_HEAD"],
  "/dashboard/hr": ["HR"],
  "/dashboard/staff": ["STAFF"],
  "/dashboard/team-lead": ["TEAM_LEAD"],

  "/dashboard/reports": [
    "ADMIN",
    "EXECUTIVE",
    "CHIEF_OF_STAFF",
    "ARM_HEAD",
    "HR",
    "TEAM_LEAD",
  ],
  "/dashboard/users": ["ADMIN"],
  "/dashboard/settings": ["ADMIN"],
  "/dashboard/approvals": ["TEAM_LEAD"],
  "/dashboard/reviews": ["CHIEF_OF_STAFF", "ARM_HEAD"],
};

export const roleRoutes: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  EXECUTIVE: "/executive/dashboard",
  CHIEF_OF_STAFF: "/chief-of-staff/dashboard",
  ARM_HEAD: "/arm-head/dashboard",
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
  EXECUTIVE: [
    "VIEW_EXECUTIVE_DASHBOARD",
    "VIEW_SCOPED_USERS",
    "VIEW_DEPARTMENTS",
    "VIEW_ALL_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_ANALYTICS",
  ],
  CHIEF_OF_STAFF: [
    "VIEW_CHIEF_OF_STAFF_DASHBOARD",
    "VIEW_SCOPED_USERS",
    "VIEW_DEPARTMENTS",
    "VIEW_TEAM_REPORTS",
    "REVIEW_REPORT",
    "VIEW_ANALYTICS",
  ],
  ARM_HEAD: [
    "VIEW_ARM_HEAD_DASHBOARD",
    "VIEW_SCOPED_USERS",
    "VIEW_DEPARTMENTS",
    "VIEW_TEAM_REPORTS",
    "REVIEW_REPORT",
    "VIEW_ANALYTICS",
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
    "VIEW_SCOPED_USERS",
    "VIEW_TEAM_REPORTS",
    "APPROVE_REPORT",
    "VIEW_ANALYTICS",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
