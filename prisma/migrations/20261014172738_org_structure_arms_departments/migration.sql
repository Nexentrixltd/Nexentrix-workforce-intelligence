/*
  Warnings:

  - You are about to drop the column `code` on the `Department` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `armId` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'PLANNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'EXECUTIVE';
ALTER TYPE "Role" ADD VALUE 'CHIEF_OF_STAFF';
ALTER TYPE "Role" ADD VALUE 'ARM_HEAD';

-- DropIndex
DROP INDEX "Department_code_key";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "code",
ADD COLUMN     "armId" TEXT NOT NULL,
ADD COLUMN     "focus" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "DepartmentStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "teamLeadId" TEXT;

-- CreateTable
CREATE TABLE "Arm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "headId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Arm_name_key" ON "Arm"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Arm_slug_key" ON "Arm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Arm_headId_key" ON "Arm"("headId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");

-- CreateIndex
CREATE INDEX "Department_armId_idx" ON "Department"("armId");

-- CreateIndex
CREATE INDEX "Department_teamLeadId_idx" ON "Department"("teamLeadId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_role_deactivatedAt_idx" ON "User"("role", "deactivatedAt");

-- AddForeignKey
ALTER TABLE "Arm" ADD CONSTRAINT "Arm_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_armId_fkey" FOREIGN KEY ("armId") REFERENCES "Arm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
