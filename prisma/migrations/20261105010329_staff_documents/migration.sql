/*
  Warnings:

  - You are about to drop the `PassportDetail` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT_PHOTO', 'APPOINTMENT_LETTER', 'EDUCATION_CERTIFICATE', 'NATIONAL_ID', 'CV', 'OTHER');

-- DropForeignKey
ALTER TABLE "PassportDetail" DROP CONSTRAINT "PassportDetail_userId_fkey";

-- DropTable
DROP TABLE "PassportDetail";

-- CreateTable
CREATE TABLE "StaffDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "DetailStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffDocument_userId_key" ON "StaffDocument"("userId");

-- CreateIndex
CREATE INDEX "StaffDocument_userId_type_idx" ON "StaffDocument"("userId", "type");

-- CreateIndex
CREATE INDEX "StaffDocument_status_idx" ON "StaffDocument"("status");

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
