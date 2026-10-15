import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  notFound,
  canManageMembers,
  type Actor,
  PROJECT_ROLES,
} from "@/lib/project-access";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.object({
  roleOnProject: z.string().trim().max(60).nullish(),
  allocation: z.number().int().min(0).max(100).nullish(),
});

async function authorize(id: string) {
  const auth = await requireApiRole(PROJECT_ROLES);
  if (!auth.ok) return { error: auth.response };

  const actor: Actor = { userId: auth.user.id, role: auth.user.role };

  const project = await prisma.project.findUnique({
    where: { id },
    select: { leadId: true },
  });
  if (!project) return { error: notFound() };
  if (!canManageMembers(actor, project)) return { error: forbidden() };

  return { project };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  try {
    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: id, userId } },
      data: parsed.data,
    });
    return NextResponse.json(member);
  } catch (e: any) {
    if (e.code === "P2025") return notFound();
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;

  if (auth.project!.leadId === userId)
    return NextResponse.json(
      { error: "Change the project lead before removing them" },
      { status: 400 },
    );

  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2025") return notFound();
    throw e;
  }
}
