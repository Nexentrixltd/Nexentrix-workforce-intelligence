import "server-only";
import { NextResponse } from "next/server";
import { DetailStatus, Role } from "@prisma/client";
import type { ZodError } from "zod";
import { getSessionUser, requireApiRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";
import {
  deletePrivateFile,
  deletePrivateImage,
  isOwnedKey,
  type RecordKind,
} from "@/lib/records-storage";
import { RECORD_REVIEWERS } from "./acess";
import { notify } from "../notifications";

export async function getSelf() {
  await requireApiRole(Object.values(Role));
  return getSessionUser();
}

export const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

export const badRequest = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

export const fieldError = (field: string, message: string) =>
  NextResponse.json(
    { error: "Validation failed", fieldErrors: { [field]: [message] } },
    { status: 400 },
  );

export const validationError = (err: ZodError) =>
  NextResponse.json(
    { error: "Validation failed", fieldErrors: err.flatten().fieldErrors },
    { status: 400 },
  );

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function safeDecrypt(payload: string, aad: string): string | null {
  try {
    return decryptField(payload, aad);
  } catch {
    return null;
  }
}

const norm = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? null);

export function changedFields<T extends object>(
  current: object,
  next: T,
  keys: (keyof T & string)[],
): boolean {
  const cur = current as Record<string, unknown>;
  const nxt = next as Record<string, unknown>;
  return keys.some((k) => norm(cur[k]) !== norm(nxt[k]));
}

export const PENDING_RESET = {
  status: DetailStatus.PENDING,
  reviewNote: null,
  reviewedById: null,
  reviewedAt: null,
} as const;

type KeyResolution =
  | { ok: true; key: string | null; changed: boolean }
  | { ok: false };

export function resolveKey(
  userId: string,
  kind: RecordKind,
  incoming: string | undefined,
  current: string | null,
): KeyResolution {
  const next = incoming?.trim();
  if (!next || next === current)
    return { ok: true, key: current, changed: false };
  if (!isOwnedKey(userId, kind, next)) return { ok: false };
  return { ok: true, key: next, changed: true };
}

export async function discardOldKey(key: string | null | undefined) {
  if (!key) return;
  try {
    await deletePrivateImage(key);
  } catch (err) {
    console.error("Failed to delete replaced file", key, err);
  }
}

export async function discardOldFile(
  key: string | null | undefined,
  mimeType: string,
) {
  if (!key) return;
  try {
    await deletePrivateFile(key, mimeType);
  } catch (err) {
    console.error("Failed to delete file", key, err);
  }
}

const NOTIFY_TYPE = "STAFF_RECORD_SUBMITTED";

export async function notifyReviewers(userId: string, label: string) {
  try {
    const [staff, reviewers] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.user.findMany({
        where: {
          role: { in: RECORD_REVIEWERS },
          deactivatedAt: null,
          id: { not: userId },
        },
        select: { id: true },
      }),
    ]);
    if (!staff || reviewers.length === 0) return;

    await notify(
      reviewers.map((r) => ({
        userId: r.id,
        type: NOTIFY_TYPE,
        title: `${staff.name} submitted ${label} for review`,
        body: "Open their records to verify or reject.",
        href: `/dashboard/hr/staff/${userId}/records`,
      })),
    );
  } catch (err) {
    console.error("notifyReviewers failed", err);
  }
}
