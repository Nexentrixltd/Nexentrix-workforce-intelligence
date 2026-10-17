import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import {
  deleteReportImages,
  getUploadedImage,
  reportFolder,
} from "@/lib/cloudinary";
import { MAX_IMAGE_BYTES, reportSubmitSchema } from "@/lib/validations/reports";
import { visibleReportsWhere } from "@/lib/reports/reports-access";
import { Actor } from "@/lib/project-access";

export const runtime = "nodejs";
const PAGE_SIZE = 15;

export async function POST(req: Request) {
  const auth = await requireApiRole(["STAFF"]);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const raw = await req.json().catch(() => null);
  const parsed = reportSubmitSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const d = parsed.data;

  const limit = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (d.reportDate > limit)
    return NextResponse.json(
      { error: { reportDate: ["The date cannot be in the future"] } },
      { status: 400 },
    );

  const projectId = d.projectId || null;

  if (projectId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { id: true },
    });
    if (!member)
      return NextResponse.json(
        { error: { projectId: ["You are not a member of that project"] } },
        { status: 400 },
      );
  }

  const reportDate = new Date(`${d.reportDate}T00:00:00.000Z`);

  const duplicate = await prisma.report.findFirst({
    where: { userId: user.id, projectId, reportDate },
    select: { id: true },
  });

  const sameDay = await prisma.report.aggregate({
    where: { userId: user.id, reportDate },
    _sum: { hoursSpent: true },
  });
  const alreadyLogged = sameDay._sum.hoursSpent ?? 0;

  let conflict: { field: string; message: string } | null = null;
  if (duplicate) {
    conflict = {
      field: projectId ? "projectId" : "reportDate",
      message: projectId
        ? "You already submitted a report for this project on this date"
        : "You already submitted a general report for this date",
    };
  } else if (alreadyLogged + d.hoursSpent > 16) {
    conflict = {
      field: "hoursSpent",
      message: `You have already reported ${alreadyLogged} hours on this date. A day cannot exceed 16 hours in total.`,
    };
  }

  if (conflict) {
    const prefix = `${reportFolder(user.id)}/`;
    await deleteReportImages(d.images.filter((id) => id.startsWith(prefix)));
    return NextResponse.json(
      { error: { [conflict.field]: [conflict.message] } },
      { status: 409 },
    );
  }

  const ids = [...new Set(d.images)];
  const prefix = `${reportFolder(user.id)}/`;
  if (ids.some((id) => !id.startsWith(prefix)))
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  let verified;
  try {
    verified = await Promise.all(ids.map(getUploadedImage));
  } catch {
    return NextResponse.json(
      { error: "One of your images could not be found. Please add it again." },
      { status: 400 },
    );
  }
  if (
    verified.some(
      (v) =>
        !["jpg", "jpeg", "png", "webp"].includes(v.format) ||
        v.bytes > MAX_IMAGE_BYTES,
    )
  )
    return NextResponse.json(
      { error: "Images must be PNG, JPG or WebP under 10MB" },
      { status: 400 },
    );

  let report;

  try {
    report = await prisma.report.create({
      data: {
        userId: user.id,
        departmentId: user.departmentId,
        projectId,
        reportDate,
        tasksCompleted: d.tasksCompleted,
        tasksInProgress: d.tasksInProgress || null,
        blockers: d.blockers || null,
        tomorrowPriority: d.tomorrowPriority || null,
        hoursSpent: d.hoursSpent,
        mood: d.mood,
        images: { create: verified },
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: { reportDate: ["You already submitted this report"] } },
        { status: 409 },
      );
    throw e;
  }
  return NextResponse.json(report, { status: 201 });
}

export async function GET(req: Request) {
  const auth = await requireApiRole(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const projectId = sp.get("projectId");
  const from = sp.get("from");
  const to = sp.get("to");
  const mineOnly = sp.get("scope") === "mine";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const actor: Actor & { departmentId: string | null } = {
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
  };

  const where = {
    AND: [
      visibleReportsWhere(actor, mineOnly),
      ...(status && ["SUBMITTED", "APPROVED", "REJECTED"].includes(status)
        ? [{ status: status as any }]
        : []),
      ...(projectId ? [{ projectId }] : []),
      ...(from
        ? [{ reportDate: { gte: new Date(`${from}T00:00:00.000Z`) } }]
        : []),
      ...(to ? [{ reportDate: { lte: new Date(`${to}T00:00:00.000Z`) } }] : []),
      ...(q
        ? [
            {
              OR: [
                {
                  tasksCompleted: { contains: q, mode: "insensitive" as const },
                },
                {
                  user: { name: { contains: q, mode: "insensitive" as const } },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reportDate: true,
        status: true,
        hoursSpent: true,
        mood: true,
        tasksCompleted: true,
        tasksInProgress: true,
        blockers: true,
        tomorrowPriority: true,
        reviewNote: true,
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        department: { select: { name: true } },
        images: { select: { id: true, width: true, height: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({ items, total, pageSize: PAGE_SIZE });
}
