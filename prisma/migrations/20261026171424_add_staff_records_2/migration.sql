/*
  Warnings:

  - You are about to drop the column `scanKey` on the `PassportDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PassportDetail" DROP COLUMN "scanKey",
ALTER COLUMN "issueDate" SET DATA TYPE DATE,
ALTER COLUMN "expiryDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "StaffProfile" ALTER COLUMN "dateOfBirth" SET DATA TYPE DATE;

-- CreateIndex
CREATE INDEX "PassportDetail_status_idx" ON "PassportDetail"("status");

-- CreateIndex
CREATE INDEX "PayrollDetail_status_idx" ON "PayrollDetail"("status");

-- CreateIndex
CREATE INDEX "SignatoryDetail_status_idx" ON "SignatoryDetail"("status");

-- CreateIndex
CREATE INDEX "StaffProfile_status_idx" ON "StaffProfile"("status");
