import { z } from "zod";
import { REPORT_WINDOW_DAYS, reportDateRange } from "../report-dates";

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const reportSchema = z.object({
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .refine(
      (d) => {
        const { min, max } = reportDateRange();
        return d >= min && d <= max;
      },
      `Choose today or one of the last ${REPORT_WINDOW_DAYS - 1} days`,
    ),
  projectId: z.string().optional(),
  hoursSpent: z
    .number()
    .min(0.5, "Enter the hours you worked")
    .max(30, "That is more than 30 hours. Check the number"),
  mood: z.number().int().min(1).max(5),
  tasksCompleted: z
    .string()
    .trim()
    .min(10, "Describe what you completed (at least 10 characters)")
    .max(3000),
  tasksInProgress: z.string().trim().max(3000).optional(),
  blockers: z.string().trim().max(3000).optional(),
  tomorrowPriority: z.string().trim().max(3000).optional(),
});

export const reportSubmitSchema = reportSchema.extend({
  images: z.array(z.string().min(1).max(300)).max(MAX_IMAGES).default([]),
});

export type ReportInput = z.infer<typeof reportSchema>;
