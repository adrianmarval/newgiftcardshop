-- AlterTable
ALTER TABLE "stock_reminder_state" ADD COLUMN     "consecutiveIdentical" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFingerprint" TEXT;
