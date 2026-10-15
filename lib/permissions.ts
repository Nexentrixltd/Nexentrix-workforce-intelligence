import { ROLES, type Role } from "@/types/rbac";

const HR_MANAGEABLE: ReadonlySet<Role> = new Set<Role>(["STAFF", "TEAM_LEAD"]);

const ASSIGNABLE: Partial<Record<Role, ReadonlySet<Role>>> = {
  ADMIN: new Set<Role>(ROLES),
  HR: HR_MANAGEABLE,
};

export function canAssignRole(actor: Role, role: Role): boolean {
  return ASSIGNABLE[actor]?.has(role) ?? false;
}

export function canManageUser(actor: Role, target: Role): boolean {
  if (actor === "ADMIN") return true;
  if (actor === "HR") return HR_MANAGEABLE.has(target);
  return false;
}

export function canModifyAccount(
  actor: { id: string; role: Role },
  target: { id: string; role: Role },
  change: { newRole?: Role; deactivate?: boolean },
): boolean {
  if (!canManageUser(actor.role, target.role)) return false;
  if (change.newRole && !canAssignRole(actor.role, change.newRole))
    return false;

  const isSelf = actor.id === target.id;
  if (
    isSelf &&
    (change.deactivate || (change.newRole && change.newRole !== actor.role))
  ) {
    return false;
  }
  return true;
}
