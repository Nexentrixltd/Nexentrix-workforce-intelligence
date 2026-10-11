import { Role } from "@/types/rbac";

const HR_MANAGEABLE: Role[] = ["STAFF", "TEAM_LEAD"];

export function canManageUser(actor: Role, target: Role) {
  if (actor === "ADMIN") return true;
  if (actor === "HR") return HR_MANAGEABLE.includes(target);
  return false;
}

export function canAssignRole(actor: Role, role: Role) {
  if (actor === "ADMIN") return true;
  if (actor === "HR") return HR_MANAGEABLE.includes(role);
  return false;
}