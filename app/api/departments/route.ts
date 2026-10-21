import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/auth/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  focus: z.string().trim().max(200).nullish(),
  armId: z.string().cuid("Choose an arm"),
  userIds: z.array(z.string().min(1)).max(500).default([]),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

class RouteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function POST(req: Request) {
  const auth = await requireApiPermission("CREATE_DEPARTMENT");
  if (!auth.ok) return auth.response;

  const actorRole = auth.user.role as Role;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, focus, armId } = parsed.data;
  const userIds = [...new Set(parsed.data.userIds)];
  const slug = slugify(name);

  if (!slug) {
    return NextResponse.json(
      { error: "Name must contain letters or numbers" },
      { status: 400 },
    );
  }

  try {
    const department = await prisma.$transaction(async (tx) => {
      const arm = await tx.arm.findUnique({
        where: { id: armId },
        select: { id: true },
      });
      if (!arm) throw new RouteError("Arm not found", 400);

      if (userIds.length > 0) {
        const members = await tx.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            role: true,
            departmentId: true,
            deactivatedAt: true,
          },
        });

        if (members.length !== userIds.length) {
          throw new RouteError("Some selected users no longer exist", 400);
        }
        if (members.some((m) => m.deactivatedAt)) {
          throw new RouteError("Some selected users are deactivated", 400);
        }
        if (members.some((m) => m.departmentId !== null)) {
          throw new RouteError(
            "Some selected users are already in a department",
            400,
          );
        }
        if (members.some((m) => !canManageUser(actorRole, m.role as Role))) {
          throw new RouteError(
            "You can't assign those accounts to a department",
            403,
          );
        }
      }

      const created = await tx.department.create({
        data: { name, slug, focus: focus || null, armId },
        select: { id: true, name: true, slug: true, armId: true },
      });

      if (userIds.length > 0) {
        const claimed = await tx.user.updateMany({
          where: {
            id: { in: userIds },
            departmentId: null,
            deactivatedAt: null,
          },
          data: { departmentId: created.id },
        });
        if (claimed.count !== userIds.length) {
          throw new RouteError(
            "Some selected users are no longer available. Refresh and try again.",
            409,
          );
        }
      }

      return created;
    });

    return NextResponse.json(department, { status: 201 });
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
    console.error("[Create Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission("DELETE_DEPARTMENT");
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Department id is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const dept = await tx.department.findUnique({
        where: { id },
        select: {
          teamLeadId: true,
          _count: { select: { members: true } },
        },
      });
      if (!dept) throw new RouteError("Department not found", 404);

      if (dept.teamLeadId || dept._count.members > 0) {
        throw new RouteError(
          "Reassign this department's members and Team Lead before deleting it.",
          409,
        );
      }

      await tx.department.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 },
        );
      }
      if (error.code === "P2003" || error.code === "P2014") {
        return NextResponse.json(
          { error: "Department is still referenced by other records" },
          { status: 409 },
        );
      }
    }
    console.error("[Delete Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 },
    );
  }
}
