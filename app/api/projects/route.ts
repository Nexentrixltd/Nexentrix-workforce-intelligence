import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations/project";
import {
  unauthorized,
  forbidden,
  visibleWhere,
  canCreate,
  Actor,
  PROJECT_ROLES,
} from "@/lib/project-access";
import { requireApiRole } from "@/lib/auth/session";
import { notify, projectHref } from "@/lib/notifications";

export async function GET(req: Request) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const departmentId = searchParams.get("departmentId");

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        visibleWhere(actor),
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { code: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
        ...(status ? [{ status: status as any }] : []),
        ...(departmentId ? [{ departmentId }] : []),
      ],
    },
    include: {
      department: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  if (!canCreate(actor)) return forbidden();

  const parsed = projectSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  const lead = await prisma.user.findUnique({ where: { id: d.leadId } });
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
    const project = await prisma.project.create({
      data: {
        name: d.name,
        code: d.code.toUpperCase(),
        description: d.description || null,
        status: d.status,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
        departmentId: d.departmentId || null,
        leadId: d.leadId,
        members: {
          create: { userId: d.leadId, roleOnProject: "Project Lead" },
        },
      },
    });

    await notify({
      userId: d.leadId,
      type: "PROJECT_LEAD_ASSIGNED",
      title: `You were made lead of ${project.name}`,
      body: project.code,
      href: projectHref("TEAM_LEAD", project.id),
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: { code: ["Project code already exists"] } },
        { status: 409 },
      );
    throw e;
  }
}
