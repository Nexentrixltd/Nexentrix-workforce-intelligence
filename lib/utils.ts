import { Permission } from "@/types/rbac";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Icon } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconFilePlus,
  IconFilesFilled,
  IconHistory,
  IconHistoryToggle,
  IconFileText,
  IconFileTextFilled,
  IconClipboardCheck,
  IconClipboardCheckFilled,
  IconUsers,
  IconUsersGroup,
  IconBuilding,
  IconBuildingBank,
  IconFolders,
  IconFolderFilled,
  IconChartBar,
  IconChartAreaFilled,
  IconChartLine,
  IconActivity,
  IconActivityHeartbeat,
  IconDownload,
  IconDownloadFilled,
  IconBell,
  IconBellFilled,
  IconSettings,
  IconSettingsFilled,
} from "@tabler/icons-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const departments = [
  {
    id: "exec",
    name: "Executive / Management",
    code: "EXEC",
  },
  {
    id: "ops",
    name: "Operations",
    code: "OPS",
  },
  {
    id: "fin",
    name: "Finance & Accounting",
    code: "FIN",
  },
  {
    id: "hr",
    name: "Human Resources",
    code: "HR",
  },
  {
    id: "csm",
    name: "Customer Support / Marketing",
    code: "CSM",
  },
  {
    id: "legal",
    name: "Legal",
    code: "LEGAL",
  },
  {
    id: "crm",
    name: "Compliance & Risk Management",
    code: "CRM",
  },
];

export const roleRoutes: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  HR: "/hr/dashboard",
  TEAM_LEAD: "/team-lead/dashboard",
  STAFF: "/staff/dashboard",
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "VIEW_ADMIN_DASHBOARD",
    "CREATE_USER",
    "EDIT_USER",
    "DELETE_USER",
    "VIEW_ALL_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_ANALYTICS",
    "MANAGE_SETTINGS",
  ],
  HR: [
    "VIEW_HR_DASHBOARD",
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

type NavItem = {
  label: string;
  href: string;
  roles: Role[];
  icon: React.ElementType;
};
export type Role = "ADMIN" | "HR" | "STAFF" | "TEAM_LEAD";

export type DashboardNavItem = {
  label: string;
  href: string;
  iconOutline: Icon;
  iconFilled: Icon;
  roles: readonly Role[];
};

export type DashboardNavSection = {
  label: string;
  items: DashboardNavItem[];
};

export const ROLES = {
  ALL: ["ADMIN", "HR", "STAFF", "TEAM_LEAD"] as const,
  ADMIN_HR_TEAM: ["ADMIN", "HR", "TEAM_LEAD"] as const,
  ADMIN_ONLY: ["ADMIN"] as const,
  STAFF_ONLY: ["STAFF"] as const,
  TEAM_LEAD_ONLY: ["TEAM_LEAD"] as const,
  HR_ONLY: ["HR"] as const,
};

export const dashboardNav: DashboardNavSection[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        iconOutline: IconLayoutDashboard,
        iconFilled: IconLayoutDashboardFilled,
        roles: ROLES.ADMIN_ONLY,
      },
      {
        label: "Dashboard",
        href: "/staff/dashboard",
        iconOutline: IconLayoutDashboard,
        iconFilled: IconLayoutDashboardFilled,
        roles: ROLES.STAFF_ONLY,
      },
      {
        label: "Dashboard",
        href: "/hr/dashboard",
        iconOutline: IconLayoutDashboard,
        iconFilled: IconLayoutDashboardFilled,
        roles: ROLES.HR_ONLY,
      },
      {
        label: "Dashboard",
        href: "/team-lead/dashboard",
        iconOutline: IconLayoutDashboard,
        iconFilled: IconLayoutDashboardFilled,
        roles: ROLES.TEAM_LEAD_ONLY,
      },
    ],
  },

  {
    label: "Reports",
    items: [
      {
        label: "Submit Report",
        href: "/staff/reports/new",
        iconOutline: IconFilePlus,
        iconFilled: IconFilesFilled,
        roles: ROLES.STAFF_ONLY,
      },
      {
        label: "My Reports",
        href: "/staff/reports/history",
        iconOutline: IconHistory,
        iconFilled: IconHistoryToggle,
        roles: ROLES.STAFF_ONLY,
      },
      {
        label: "Reports",
        href: "/reports/all",
        iconOutline: IconFileText,
        iconFilled: IconFileTextFilled,
        roles: ROLES.ADMIN_HR_TEAM,
      },
      {
        label: "Approvals",
        href: "/team-lead/approvals",
        iconOutline: IconClipboardCheck,
        iconFilled: IconClipboardCheckFilled,
        roles: ROLES.TEAM_LEAD_ONLY,
      },
    ],
  },

  {
    label: "Management",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        iconOutline: IconUsers,
        iconFilled: IconUsersGroup,
        roles: ROLES.ADMIN_ONLY,
      },
      {
        label: "Departments",
        href: "/admin/departments",
        iconOutline: IconBuilding,
        iconFilled: IconBuildingBank,
        roles: ROLES.ADMIN_ONLY,
      },
      {
        label: "Projects",
        href: "/admin/projects",
        iconOutline: IconFolders,
        iconFilled: IconFolderFilled,
        roles: ROLES.ADMIN_ONLY,
      },
    ],
  },

  {
    label: "Analytics",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        iconOutline: IconChartBar,
        iconFilled: IconChartAreaFilled,
        roles: ROLES.ADMIN_HR_TEAM,
      },
      {
        label: "Team Performance",
        href: "/team-lead/performance",
        iconOutline: IconChartLine,
        iconFilled: IconChartAreaFilled,
        roles: ROLES.TEAM_LEAD_ONLY,
      },
      {
        label: "Performance",
        href: "/hr/performance",
        iconOutline: IconActivity,
        iconFilled: IconActivityHeartbeat,
        roles: ROLES.HR_ONLY,
      },
      {
        label: "Consistency",
        href: "/hr/consistency",
        iconOutline: IconActivity,
        iconFilled: IconActivityHeartbeat,
        roles: ROLES.HR_ONLY,
      },
    ],
  },

  {
    label: "System",
    items: [
      {
        label: "Exports",
        href: "/exports",
        iconOutline: IconDownload,
        iconFilled: IconDownloadFilled,
        roles: ROLES.ADMIN_HR_TEAM,
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        iconOutline: IconBell,
        iconFilled: IconBellFilled,
        roles: ROLES.ADMIN_ONLY,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        iconOutline: IconSettings,
        iconFilled: IconSettingsFilled,
        roles: ROLES.ALL,
      },
    ],
  },
];
