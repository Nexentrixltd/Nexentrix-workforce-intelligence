/*
  Warnings:

  - The values [DEFFERED_PAYMENT_FORM] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('PASSPORT_PHOTO', 'APPOINTMENT_LETTER', 'EDUCATION_CERTIFICATE', 'NATIONAL_ID', 'DEFERRED_PAYMENT_FORM', 'EMPLOYEE_HANDBOOK', 'CV', 'OTHER');
ALTER TABLE "StaffDocument" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;
