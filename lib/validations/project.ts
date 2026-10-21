import { z } from "zod";

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

const fields = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  code: z.string().trim().min(3, "Code is too short").max(30),
  description: z.string().trim().max(2000).nullish(),
  status: z.enum(PROJECT_STATUSES),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  departmentId: z.string().nullish(),
  leadId: z.string().min(1, "Select a project lead"),
});

const datesOk = (d: { startDate?: string | null; endDate?: string | null }) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;
const datesRule = {
  message: "End date must be after start date",
  path: ["endDate"],
};

export const projectSchema = fields.refine(datesOk, datesRule);

export const projectLeadEditSchema = fields
  .pick({
    name: true,
    description: true,
    status: true,
    startDate: true,
    endDate: true,
  })
  .refine(datesOk, datesRule);

export type ProjectInput = z.infer<typeof projectSchema>;
