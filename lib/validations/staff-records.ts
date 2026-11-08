import { z } from "zod";
import { DOCUMENT_TYPES, DocumentTypeKey } from "@/lib/staff-records/documents";

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

const text = (max = 120) => z.string().trim().min(1, "Required").max(max);

const optionalText = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional();

const phone = z.string().trim().regex(PHONE_RE, "Enter a valid phone number");

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || PHONE_RE.test(v), "Enter a valid phone number")
  .transform((v) => v || undefined)
  .optional();

const keyField = z.string().trim().max(300).optional();

export const staffProfileSchema = z.object({
  preferredName: optionalText(60),
  phone,
  altPhone: optionalPhone,
  personalEmail: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      "Enter a valid email",
    )
    .transform((v) => v || undefined)
    .optional(),
  addressLine: text(200),
  city: text(80),
  state: text(80),
  country: text(80),
  dateOfBirth: z.coerce
    .date()
    .refine((d) => d < new Date(), "Date of birth cannot be in the future")
    .refine((d) => d.getFullYear() > 1900, "Enter a valid date of birth"),
  gender: optionalText(30),
  maritalStatus: optionalText(30),
  nationality: text(80),
  stateOfOrigin: optionalText(80),
  photoKey: keyField,
});

export const emergencyContactSchema = z.object({
  name: text(100),
  relationship: text(50),
  phone,
  altPhone: optionalPhone,
  address: optionalText(200),
  isPrimary: z.boolean().default(false),
});

export const payrollSchema = z.object({
  bankName: text(100),
  accountName: text(120),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Enter a valid account number"),
});

export const payrollUpdateSchema = payrollSchema.extend({
  accountNumber: z
    .union([z.literal(""), payrollSchema.shape.accountNumber])
    .optional(),
});

export const signatorySchema = z.object({
  signatoryName: text(120),
  title: optionalText(80),
  signatureKey: keyField,
});

export const documentUploadSchema = z
  .object({
    type: z.enum(DOCUMENT_TYPES as [DocumentTypeKey, ...DocumentTypeKey[]]),
    title: z.string().trim().max(100).optional(),
  })
  .refine((d) => d.type !== "OTHER" || Boolean(d.title), {
    path: ["title"],
    message: "Enter a title for this document",
  });

export type StaffProfileInput = z.infer<typeof staffProfileSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type PayrollInput = z.infer<typeof payrollSchema>;
export type PayrollUpdateInput = z.infer<typeof payrollUpdateSchema>;
export type SignatoryInput = z.infer<typeof signatorySchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
