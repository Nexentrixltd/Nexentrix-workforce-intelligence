import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { reportDateRange } from "@/lib/report-dates";

export async function GET() {
  const auth = await requireApiRole(["STAFF"]);
  if (!auth.ok) return auth.response;

  const { min, max } = reportDateRange();
  const rows = await prisma.report.findMany({
    where: {
      userId: auth.user.id,
      reportDate: {
        gte: new Date(`${min}T00:00:00.000Z`),
        lte: new Date(`${max}T00:00:00.000Z`),
      },
    },
    select: { reportDate: true, projectId: true },
  });

  return NextResponse.json(
    rows.map((r) => ({
      date: r.reportDate.toISOString().slice(0, 10),
      projectId: r.projectId,
    })),
  );
}
