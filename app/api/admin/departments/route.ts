// app/api/admin/departments/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";

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

export async function POST(req: Request) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

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
      const available = await prisma.user.count({
        where: { id: { in: userIds }, departmentId: "" },
      });
      if (available !== userIds.length) {
        return NextResponse.json(
          {
            error: "Some selected users are missing or already in a department",
          },
          { status: 400 },
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        users: { connect: userIds.map((id) => ({ id })) },
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A department with that name or code already exists" },
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
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Department id is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
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
