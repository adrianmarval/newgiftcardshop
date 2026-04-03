/*
  Warnings:

  - Made the column `sellRate` on table `giftcard_batch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `buyRate` on table `order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `buyRate` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sellRate` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "giftcard_batch" ALTER COLUMN "sellRate" SET NOT NULL;

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "buyRate" SET NOT NULL;

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "buyRate" SET NOT NULL,
ALTER COLUMN "sellRate" SET NOT NULL;
