/*
  Warnings:

  - A unique constraint covering the columns `[userId,projectId,reportDate]` on the table `Report` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Report_userId_reportDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_projectId_reportDate_key" ON "Report"("userId", "projectId", "reportDate");

CREATE UNIQUE INDEX "Report_userId_reportDate_general_key"
  ON "Report" ("userId", "reportDate")
  WHERE "projectId" IS NULL;