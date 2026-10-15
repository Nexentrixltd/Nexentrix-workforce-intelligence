import { Permission, Role } from "@/types/rbac";
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
  IconSitemap,
  IconSitemapFilled,
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
        label: "Arms",
        href: "/admin/arms",
        iconOutline: IconSitemap,
        iconFilled: IconSitemapFilled,
        roles: ROLES.ADMIN_ONLY,
      },
      {
        label: "Employees",
        href: "/admin/employees",
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
      {
        label: "Employees",
        href: "/hr/employees",
        iconOutline: IconUsers,
        iconFilled: IconUsersGroup,
        roles: ROLES.HR_ONLY,
      },
      {
        label: "Departments",
        href: "/hr/departments",
        iconOutline: IconBuilding,
        iconFilled: IconBuildingBank,
        roles: ROLES.HR_ONLY,
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

export const ROLE_STYLES: Record<Role, { label: string; cls: string }> = {
  ADMIN: {
    label: "Admin",
    cls: "bg-rose-50 text-rose-700",
  },
  EXECUTIVE: {
    label: "Executive",
    cls: "bg-amber-50 text-amber-700",
  },
  CHIEF_OF_STAFF: {
    label: "Chief of Staff",
    cls: "bg-blue-50 text-blue-700",
  },
  ARM_HEAD: {
    label: "Arm Head",
    cls: "bg-cyan-50 text-cyan-700",
  },
  HR: {
    label: "HR",
    cls: "bg-violet-50 text-violet-700",
  },
  TEAM_LEAD: {
    label: "Team Lead",
    cls: "bg-emerald-50 text-emerald-700",
  },
  STAFF: {
    label: "Staff",
    cls: "bg-slate-100 text-slate-700",
  },
};
