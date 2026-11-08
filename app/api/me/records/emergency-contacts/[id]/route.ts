import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emergencyContactSchema } from "@/lib/validations/staff-records";
import {
  badRequest,
  getSelf,
  notFound,
  readJson,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

const SELECT = {
  id: true,
  name: true,
  relationship: true,
  phone: true,
  altPhone: true,
  address: true,
  isPrimary: true,
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const { id } = await params;
  const existing = await prisma.emergencyContact.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return notFound();

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = emergencyContactSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const isPrimary = existing.isPrimary || input.isPrimary;

  const contact = await prisma.$transaction(async (tx) => {
    if (isPrimary && !existing.isPrimary) {
      await tx.emergencyContact.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      });
    }
    return tx.emergencyContact.update({
      where: { id },
      data: {
        name: input.name,
        relationship: input.relationship,
        phone: input.phone,
        altPhone: input.altPhone ?? null,
        address: input.address ?? null,
        isPrimary,
      },
      select: SELECT,
    });
  });

  return NextResponse.json({ contact });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const { id } = await params;
  const existing = await prisma.emergencyContact.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return notFound();

  await prisma.$transaction(async (tx) => {
    await tx.emergencyContact.delete({ where: { id } });

    if (existing.isPrimary) {
      const next = await tx.emergencyContact.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (next) {
        await tx.emergencyContact.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
