import { ROLES } from "@/types/rbac";
import { z } from "zod";

export const employeeSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short"),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    role: z.enum(ROLES),
    departmentId: z.string().cuid().nullish(),
    armId: z.string().cuid().nullish(),
  })
  .superRefine((v, ctx) => {
    if ((v.role === "TEAM_LEAD" || v.role === "STAFF") && !v.departmentId) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Department is required for this role" });
    }
    if (v.role === "ARM_HEAD" && !v.armId) {
      ctx.addIssue({ code: "custom", path: ["armId"], message: "Arm is required for an Arm Head" });
    }
  });

export type EmployeeInput = z.infer<typeof employeeSchema>;