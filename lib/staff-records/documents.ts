import type { DocumentType } from "@prisma/client";

export type DocumentTypeKey = DocumentType;

export const DOCUMENT_LABELS = {
  PASSPORT_PHOTO: "Passport photograph",
  APPOINTMENT_LETTER: "Appointment letter",
  EDUCATION_CERTIFICATE: "Education certificate",
  NATIONAL_ID: "National ID",
  CV: "CV / Resume",
  EMPLOYEE_HANDBOOK: "Employee handbook",
  DEFERRED_PAYMENT_FORM: "Deferred payment form",
  OTHER: "Other document",
} satisfies Record<DocumentType, string>;

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_LABELS) as DocumentTypeKey[];

export const REQUIRED_DOCUMENT_TYPES: readonly DocumentTypeKey[] = [
  "PASSPORT_PHOTO",
  "APPOINTMENT_LETTER",
];

export const SINGLE_FILE_TYPES: readonly DocumentTypeKey[] = ["PASSPORT_PHOTO"];

export const IMAGE_ONLY_TYPES: readonly DocumentTypeKey[] = ["PASSPORT_PHOTO"];

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_USER = 20;

export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
export const ACCEPT_ALL = `${ACCEPT_IMAGES},application/pdf`;