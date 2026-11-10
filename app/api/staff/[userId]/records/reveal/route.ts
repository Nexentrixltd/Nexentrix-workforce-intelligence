import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireApiRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { decryptField, fieldAad } from "@/lib/crypto";
import {
  badRequest,
  notFound,
  readJson,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";

export const runtime = "nodejs";

const schema = z.object({ field: z.literal("payroll.accountNumber") });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  await requireApiRole(RECORD_REVIEWERS);
  const actor = await getSessionUser();
  if (!actor) return unauthorized();

  const { userId } = await params;

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const payroll = await prisma.payrollDetail.findUnique({
    where: { userId },
    select: { accountNumberEnc: true },
  });
  if (!payroll) return notFound();

  let value: string;
  try {
    value = decryptField(
      payroll.accountNumberEnc,
      fieldAad(userId, parsed.data.field),
    );
  } catch (err) {
    console.error("[reveal] could not decrypt", userId, err);
    return badRequest("Could not read this value.", 500);
  }

  try {
    await prisma.sensitiveAccessLog.create({
      data: {
        actorId: actor.id,
        targetUserId: userId,
        field: parsed.data.field,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
  } catch (err) {
    console.error("[reveal] could not write access log", err);
    return badRequest(
      "Could not record this access, so it was not shown.",
      500,
    );
  }

  return NextResponse.json(
    { value },
    { headers: { "Cache-Control": "no-store" } },
  );
}
