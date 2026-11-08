import type { Role } from "@prisma/client";

export const RECORD_REVIEWERS: Role[] = ["HR", "ADMIN"];

export const canReviewRecords = (role: Role) => RECORD_REVIEWERS.includes(role);