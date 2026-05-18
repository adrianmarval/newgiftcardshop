/*
  Warnings:

  - Added the required column `tierUpdatedAt` to the `giftcard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "giftcard" ADD COLUMN     "escalationTier" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "tierStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tierUpdatedAt" TIMESTAMP(3) NOT NULL;
