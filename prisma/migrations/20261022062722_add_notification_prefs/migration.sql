-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mutedNotifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
