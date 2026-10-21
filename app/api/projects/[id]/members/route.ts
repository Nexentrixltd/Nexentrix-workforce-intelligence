import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  notFound,
  canManageMembers,
  PROJECT_ROLES,
  Actor,
} from "@/lib/project-access";
import { requireApiRole } from "@/lib/auth/session";
import { notify, projectHref } from "@/lib/notifications";

const addSchema = z.object({
  userId: z.string().min(1),
  roleOnProject: z.string().trim().max(60).nullish(),
  allocation: z.number().int().min(0).max(100).nullish(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return auth.response;
  const actor = {
    userId: auth.user.id,
    role: auth.user.role,
  } as Actor;

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { leadId: true, name: true },
  });
  if (!project) return notFound();
  if (!canManageMembers(actor, project)) return forbidden();

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: d.userId,
        roleOnProject: d.roleOnProject || null,
        allocation: d.allocation ?? null,
      },
    });

    const target = await prisma.user.findUnique({
      where: { id: d.userId },
      select: { role: true },
    });
    if (d.userId !== actor.userId)
      await notify({
        userId: d.userId,
        type: "PROJECT_ADDED",
        title: `You were added to ${project.name} project`,
        body: d.roleOnProject ? `Your role: ${d.roleOnProject}` : null,
        href: projectHref(target?.role, id),
      });
    return NextResponse.json(member, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 },
      );
    if (e.code === "P2003")
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    throw e;
  }
}
