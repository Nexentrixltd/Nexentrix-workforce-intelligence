import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emergencyContactSchema } from "@/lib/validations/staff-records";
import {
  badRequest,
  getSelf,
  readJson,
  unauthorized,
  validationError,
} from "@/lib/staff-records/service";

export const runtime = "nodejs";

const MAX_CONTACTS = 5;

const SELECT = {
  id: true,
  name: true,
  relationship: true,
  phone: true,
  altPhone: true,
  address: true,
  isPrimary: true,
} as const;

export async function GET() {
  const user = await getSelf();
  if (!user) return unauthorized();

  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: SELECT,
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  const user = await getSelf();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (body === undefined) return badRequest("Invalid JSON");

  const parsed = emergencyContactSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const count = await prisma.emergencyContact.count({
    where: { userId: user.id },
  });
  if (count >= MAX_CONTACTS) {
    return badRequest(
      `You can add up to ${MAX_CONTACTS} emergency contacts`,
      409,
    );
  }

  const makePrimary = input.isPrimary || count === 0;

  const contact = await prisma.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.emergencyContact.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      });
    }
    return tx.emergencyContact.create({
      data: {
        userId: user.id,
        name: input.name,
        relationship: input.relationship,
        phone: input.phone,
        altPhone: input.altPhone ?? null,
        address: input.address ?? null,
        isPrimary: makePrimary,
      },
      select: SELECT,
    });
  });

  return NextResponse.json({ contact }, { status: 201 });
}
