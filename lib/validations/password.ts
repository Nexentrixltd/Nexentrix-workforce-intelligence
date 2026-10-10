import { z } from "zod";

export const newPasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "At most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your temporary password"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the temporary one",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;