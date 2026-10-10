import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Code: letters, numbers and dashes only")
    .transform((v) => v.toUpperCase()),
  userIds: z.array(z.string().min(1)).max(500).default([]),
});

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        users: { select: { id: true } },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        userIds: department.users.map((u) => u.id),
      },
    });
  } catch (error) {
    console.error("[Get Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to load department" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, code } = parsed.data;
  const userIds = [...new Set(parsed.data.userIds)];

  try {
    if (userIds.length > 0) {
      const existing = await prisma.user.count({
        where: { id: { in: userIds } },
      });
      if (existing !== userIds.length) {
        return NextResponse.json(
          { error: "Some selected users no longer exist" },
          { status: 400 },
        );
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        users: { set: userIds.map((uid) => ({ id: uid })) },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 },
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A department with that name or code already exists" },
          { status: 409 },
        );
      }
    }
    console.error("[Update Department] Failed:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}
