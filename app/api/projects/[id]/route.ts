import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import {
  projectSchema,
  projectLeadEditSchema,
} from "@/lib/validations/project";
import {
  PROJECT_ROLES,
  forbidden,
  notFound,
  seesAll,
  visibleWhere,
  canEdit,
  canDelete,
  canManageMembers,
  type Actor,
} from "@/lib/project-access";
import { notify, projectHref } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string }> };

const IN_PROGRESS = ["PLANNING", "ACTIVE", "ON_HOLD"] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor: Actor = { userId: auth.user.id, role: auth.user.role };
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, visibleWhere(actor)] },
    include: {
      department: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, image: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              image: true,
              projectMembers: {
                where: { project: { status: { in: [...IN_PROGRESS] } } },
                select: { allocation: true },
              },
            },
          },
        },
      },
    },
  });
  if (!project) return notFound();

  const showTotals = seesAll(actor) || project.leadId === actor.userId;

  const members = project.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    image: m.user.image ?? '',
    role: m.user.role,
    roleOnProject: m.roleOnProject,
    allocation: showTotals || m.userId === actor.userId ? m.allocation : null,
    totalAllocation: showTotals
      ? m.user.projectMembers.reduce((s, pm) => s + (pm.allocation ?? 0), 0)
      : null,
  }));

  const editable = canEdit(actor, project);

  return NextResponse.json({
    ...project,
    members,
    canManage: canManageMembers(actor, project),
    canEdit: editable,
    editScope: !editable ? null : actor.role === "ADMIN" ? "full" : "limited",
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor: Actor = { userId: auth.user.id, role: auth.user.role };
  const { id } = await params;

  const existing = await prisma.project.findFirst({
    where: { AND: [{ id }, visibleWhere(actor)] },
    select: { id: true, leadId: true },
  });
  if (!existing) return notFound();
  if (!canEdit(actor, existing)) return forbidden();

  const body = await req.json().catch(() => null);

  if (actor.role !== "ADMIN") {
    const parsed = projectLeadEditSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    const d = parsed.data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: d.name,
        description: d.description || null,
        status: d.status,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
      },
    });
    return NextResponse.json(project);
  }

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  const lead = await prisma.user.findUnique({
    where: { id: d.leadId },
    select: { id: true, role: true, deactivatedAt: true },
  });
  if (
    !lead ||
    lead.deactivatedAt ||
    !["TEAM_LEAD", "STAFF"].includes(lead.role)
  )
    return NextResponse.json(
      { error: { leadId: ["Lead must be a team lead or staff member"] } },
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

    if (existing.leadId !== d.leadId)
      await notify({
        userId: d.leadId,
        type: "PROJECT_LEAD_ASSIGNED",
        title: `You were made lead of ${project.name} project.`,
        body: project.code,
        href: projectHref(lead.role, id),
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
  const actor: Actor = { userId: auth.user.id, role: auth.user.role };
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
