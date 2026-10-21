import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { signedImageUrl } from "@/lib/cloudinary";
import { visibleReportsWhere } from "@/lib/reports/reports-access";

const WIDTHS = { thumb: 480, full: 1600 } as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const size =
    new URL(req.url).searchParams.get("size") === "full" ? "full" : "thumb";

  const image = await prisma.reportImage.findFirst({
    where: {
      id,
      report: visibleReportsWhere({
        userId: auth.user.id,
        role: auth.user.role,
        departmentId: auth.user.departmentId,
      }),
    },
    select: { publicId: true },
  });
  if (!image)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const res = NextResponse.redirect(
    signedImageUrl(image.publicId, WIDTHS[size]),
    302,
  );
  res.headers.set("Cache-Control", "private, max-age=3600");
  return res;
}