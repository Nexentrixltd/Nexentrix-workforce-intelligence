import { z } from "zod";

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export const projectSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120),
    code: z.string().trim().min(3, "Code is too short").max(30),
    description: z.string().trim().max(2000).nullish(),
    status: z.enum(PROJECT_STATUSES),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    departmentId: z.string().nullish(),
    leadId: z.string().min(1, "Select a project lead"),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;
