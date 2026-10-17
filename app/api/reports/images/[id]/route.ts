import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/session";
import { signedImageUrl } from "@/lib/cloudinary";

const WIDTHS = { thumb: 480, full: 1600 } as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireApiRole(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]);
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const size =
    new URL(req.url).searchParams.get("size") === "full" ? "full" : "thumb";

  const image = await prisma.reportImage.findUnique({
    where: { id },
    select: {
      publicId: true,
      report: { select: { userId: true, departmentId: true } },
    },
  });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { report } = image;
  const allowed =
    user.role === "ADMIN" ||
    user.role === "HR" ||
    report.userId === user.id ||
    (user.role === "TEAM_LEAD" &&
      !!report.departmentId &&
      report.departmentId === user.departmentId);

  if (!allowed)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const res = NextResponse.redirect(
    signedImageUrl(image.publicId, WIDTHS[size]),
    302,
  );
  res.headers.set("Cache-Control", "private, max-age=3600");
  return res;
}
