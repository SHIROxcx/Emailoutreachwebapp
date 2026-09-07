/*
  Warnings:

  - Added the required column `recipientEmail` to the `SendLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `SendLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "dailyLimit" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "dryRunMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxConsecutiveErrors" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "minIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "safetyPausedReason" TEXT,
ADD COLUMN     "sendingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
ADD COLUMN     "sendingWindowEnd" TEXT NOT NULL DEFAULT '17:00',
ADD COLUMN     "sendingWindowStart" TEXT NOT NULL DEFAULT '09:00';

-- AlterTable
ALTER TABLE "MailboxConnection" ADD COLUMN     "dailyLimit" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "SendLog" ADD COLUMN     "bodyPreview" TEXT,
ADD COLUMN     "campaignName" TEXT,
ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recipientEmail" TEXT NOT NULL,
ADD COLUMN     "subject" TEXT NOT NULL,
ALTER COLUMN "enrollmentId" DROP NOT NULL,
ALTER COLUMN "stepId" DROP NOT NULL;
