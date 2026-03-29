/*
  Warnings:

  - You are about to drop the column `isClaimed` on the `giftcard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "giftcard" DROP COLUMN "isClaimed",
ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT false;
