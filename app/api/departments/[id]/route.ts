import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canAccessDepartment } from "@/lib/access";
import { canAssignRole } from "@/lib/permissions";
import type { Role } from "@/types/rbac";

type Ctx = { params: Promise<{ id: string }> };

const MANAGED_ROLES: Role[] = ["STAFF", "TEAM_LEAD", "HR"];
const LEADABLE_ROLES: Role[] = ["STAFF", "TEAM_LEAD"];

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  focus: z.string().trim().max(200).nullish(),
  status: z.enum(["ACTIVE", "PLANNED"]),
  teamLeadId: z.string().cuid().nullable().optional(),
  userIds: z.array(z.string().cuid()).max(500),
});

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("VIEW_DEPARTMENTS");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!(await canAccessDepartment(auth.user, id))) {
    return NextResponse.json(
      { error: "Department not found" },
      { status: 404 },
    );
  }

  try {
    const dept = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        focus: true,
        status: true,
        teamLeadId: true,
        teamLead: { select: { role: true } },
        members: {
          where: { deactivatedAt: null, role: { in: MANAGED_ROLES } },
          select: { id: true },
        },
      },
    });
    if (!dept) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        department: {
          id: dept.id,
          name: dept.name,
          focus: dept.focus,
          status: dept.status,
          teamLeadId: dept.teamLeadId,
          leadLocked:
            !!dept.teamLead &&
            !LEADABLE_ROLES.includes(dept.teamLead.role as Role),
          userIds: dept.members.map((m) => m.id),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Department GET] Failed:", error);
    return NextResponse.json(
      { error: "Failed to load department" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiPermission("EDIT_DEPARTMENT");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, focus, status, teamLeadId, userIds } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const dept = await tx.department.findUnique({
        where: { id },
        select: {
          id: true,
          teamLeadId: true,
          teamLead: { select: { role: true } },
        },
      });
      if (!dept) throw new RouteError("Department not found", 404);

      const leadLocked =
        !!dept.teamLead && !LEADABLE_ROLES.includes(dept.teamLead.role as Role);
      const nextLeadId =
        teamLeadId === undefined ? dept.teamLeadId : teamLeadId;
      const leadChanged = nextLeadId !== dept.teamLeadId;

      if (leadLocked && leadChanged) {
        throw new RouteError(
          "This department's lead is managed by an Admin",
          400,
        );
      }

      // ---- Members (only STAFF / TEAM_LEAD / HR are managed here) ----
      const current = await tx.user.findMany({
        where: {
          departmentId: id,
          deactivatedAt: null,
          role: { in: MANAGED_ROLES },
        },
        select: { id: true },
      });
      const currentIds = new Set(current.map((u) => u.id));
      const wanted = new Set(userIds);
      const toAdd = userIds.filter((u) => !currentIds.has(u));
      const toRemove = [...currentIds].filter((u) => !wanted.has(u));

      if (!leadLocked && nextLeadId && !wanted.has(nextLeadId)) {
        if (leadChanged) {
          throw new RouteError(
            "The Team Lead must be a member of the department",
            400,
          );
        }
        if (currentIds.has(nextLeadId)) {
          throw new RouteError(
            "Replace the Team Lead before removing them from the department",
            400,
          );
        }
      }

      if (toAdd.length) {
        const claimed = await tx.user.updateMany({
          where: {
            id: { in: toAdd },
            departmentId: null,
            deactivatedAt: null,
            role: { in: MANAGED_ROLES },
          },
          data: { departmentId: id },
        });
        if (claimed.count !== toAdd.length) {
          throw new RouteError(
            "Some selected users are no longer available. Refresh and try again.",
            409,
          );
        }
      }

      if (toRemove.length) {
        await tx.user.updateMany({
          where: { id: { in: toRemove }, departmentId: id },
          data: { departmentId: null },
        });
      }

      if (!leadLocked && leadChanged) {
        if (nextLeadId) {
          if (!canAssignRole(auth.user.role as Role, "TEAM_LEAD")) {
            throw new RouteError("You can't assign Team Leads", 403);
          }
          const next = await tx.user.findUnique({
            where: { id: nextLeadId },
            select: { role: true, deactivatedAt: true },
          });
          if (
            !next ||
            next.deactivatedAt ||
            !LEADABLE_ROLES.includes(next.role as Role)
          ) {
            throw new RouteError(
              "Choose an active Staff or Team Lead member as the lead",
              400,
            );
          }
          if (next.role === "STAFF") {
            await tx.user.update({
              where: { id: nextLeadId },
              data: { role: "TEAM_LEAD" },
            });
          }
        }

        if (dept.teamLeadId) {
          const stillLeads = await tx.department.count({
            where: { teamLeadId: dept.teamLeadId, id: { not: id } },
          });
          if (stillLeads === 0) {
            await tx.user.updateMany({
              where: { id: dept.teamLeadId, role: "TEAM_LEAD" },
              data: { role: "STAFF" },
            });
          }
        }
      }

      await tx.department.update({
        where: { id },
        data: { name, focus: focus || null, status, teamLeadId: nextLeadId },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A department with that name already exists" },
        { status: 409 },
      );
    }
    console.error("[Department PATCH] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}
