import type { Role } from "@/types/rbac";
import { NextResponse } from "next/server";

export const PROJECT_ROLES: Role[] = ["ADMIN", "HR", "TEAM_LEAD", "STAFF"];

export type Actor = { userId: string; role: Role };

export const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });
export const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

export const seesAll = (a: Actor) => a.role === "ADMIN" || a.role === "HR";

export function visibleWhere(a: Actor) {
  if (seesAll(a)) return {};
  return {
    OR: [{ leadId: a.userId }, { members: { some: { userId: a.userId } } }],
  };
}

const leadsProject = (a: Actor, project: { leadId: string }) =>
  project.leadId === a.userId && (a.role === "TEAM_LEAD" || a.role === "STAFF");

export const canCreate = (a: Actor) => a.role === "ADMIN";
export const canDelete = (a: Actor) => a.role === "ADMIN";

export const canEdit = (a: Actor, project: { leadId: string }) =>
  a.role === "ADMIN" || leadsProject(a, project);

export const canManageMembers = (a: Actor, project: { leadId: string }) =>
  a.role === "ADMIN" || leadsProject(a, project);
