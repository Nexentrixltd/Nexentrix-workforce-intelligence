import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const EXEC_DEPARTMENT_SLUG = "executive-board-office";

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const schema = z.object({ userId: z.string().cuid().nullable() });

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { userId } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const arm = await tx.arm.findUnique({
        where: { id },
        select: { isShared: true, headId: true },
      });
      if (!arm) throw new RouteError("Arm not found", 404);

      const headRole = arm.isShared ? "CHIEF_OF_STAFF" : "ARM_HEAD";
      const headLabel = arm.isShared ? "Chief of Staff" : "Arm Head";
      const oldHeadId = arm.headId;

      if (userId === oldHeadId) return; 

      let exec: { id: string; teamLeadId: string | null } | null = null;
      if (arm.isShared) {
        exec = await tx.department.findUnique({
          where: { slug: EXEC_DEPARTMENT_SLUG },
          select: { id: true, teamLeadId: true },
        });
        if (!exec)
          throw new RouteError(
            "Executive / Board Office is missing. Run the seed.",
            500,
          );
        if (userId && exec.teamLeadId && exec.teamLeadId !== oldHeadId) {
          throw new RouteError(
            "The Executive / Board Office already has a different Team Lead. Replace them from the Departments page first.",
            409,
          );
        }
      }

      let previousRole: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            role: true,
            deactivatedAt: true,
            headOfArm: { select: { name: true } },
            ledDepartments: { select: { name: true } },
          },
        });
        if (!u || u.deactivatedAt)
          throw new RouteError("Choose an active user", 400);
        if (u.headOfArm) {
          throw new RouteError(
            `${u.name} already heads ${u.headOfArm.name}`,
            409,
          );
        }
        if (u.ledDepartments.length > 0) {
          throw new RouteError(
            `${u.name} leads ${u.ledDepartments.map((d) => d.name).join(", ")}. Replace them as Team Lead first.`,
            409,
          );
        }
        if (!["STAFF", "TEAM_LEAD", headRole].includes(u.role)) {
          throw new RouteError(
            `That account's role can't be changed to ${headLabel}`,
            400,
          );
        }
        previousRole = u.role;
      }

      if (oldHeadId) {
        await tx.arm.update({ where: { id }, data: { headId: null } });
        if (exec && exec.teamLeadId === oldHeadId) {
          await tx.department.update({
            where: { id: exec.id },
            data: { teamLeadId: null },
          });
        }
        await tx.user.updateMany({
          where: { id: oldHeadId, role: headRole },
          data: { role: "STAFF", departmentId: null },
        });
        await tx.session.updateMany({
          where: { userId: oldHeadId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      if (userId) {
        await tx.arm.update({ where: { id }, data: { headId: userId } });
        await tx.user.update({
          where: { id: userId },
          data: { role: headRole, departmentId: exec ? exec.id : null },
        });
        if (exec) {
          await tx.department.update({
            where: { id: exec.id },
            data: { teamLeadId: userId, status: "ACTIVE" },
          });
        }
        if (previousRole !== headRole) {
          await tx.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }
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
        { error: "That person already heads an arm" },
        { status: 409 },
      );
    }
    console.error("[Arm Head] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update the arm head" },
      { status: 500 },
    );
  }
}
