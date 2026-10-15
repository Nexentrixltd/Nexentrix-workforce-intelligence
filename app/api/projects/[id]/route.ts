import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations/project";
import {
  unauthorized,
  forbidden,
  notFound,
  seesAll,
  visibleWhere,
  canEdit,
  canDelete,
  PROJECT_ROLES,
  Actor,
} from "@/lib/project-access";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, visibleWhere(actor)] },
    include: {
      department: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              projectMembers: { select: { allocation: true } },
            },
          },
        },
      },
    },
  });
  if (!project) return notFound();

  const showTotals = seesAll(actor);

  const members = project.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    role: m.user.role,
    roleOnProject: m.roleOnProject,
    allocation: showTotals || m.userId === actor.userId ? m.allocation : null,
    totalAllocation: showTotals
      ? m.user.projectMembers.reduce((s, pm) => s + (pm.allocation ?? 0), 0)
      : null,
  }));

  return NextResponse.json({ ...project, members });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  if (!canEdit(actor)) return forbidden();
  const { id } = await params;

  const parsed = projectSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  const lead = await prisma.user.findUnique({ where: { id: d.leadId } });
  if (!lead || lead.role !== "TEAM_LEAD")
    return NextResponse.json(
      { error: { leadId: ["Lead must be a Team Lead"] } },
      { status: 400 },
    );

  try {
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: {
          name: d.name,
          code: d.code.toUpperCase(),
          description: d.description || null,
          status: d.status,
          startDate: d.startDate ? new Date(d.startDate) : null,
          endDate: d.endDate ? new Date(d.endDate) : null,
          departmentId: d.departmentId || null,
          leadId: d.leadId,
        },
      });
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: id, userId: d.leadId } },
        update: { roleOnProject: "Project Lead" },
        create: {
          projectId: id,
          userId: d.leadId,
          roleOnProject: "Project Lead",
        },
      });
      return updated;
    });
    return NextResponse.json(project);
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: { code: ["Project code already exists"] } },
        { status: 409 },
      );
    if (e.code === "P2025") return notFound();
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  if (!canDelete(actor)) return forbidden();
  const { id } = await params;

  try {
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2025") return notFound();
    throw e;
  }
}
