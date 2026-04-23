/*
  Warnings:

  - The `batchId` column on the `giftcard` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `giftcard_batch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `giftcard_batch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `batchId` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "giftcard" DROP CONSTRAINT "giftcard_batchId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_batchId_fkey";

-- AlterTable
ALTER TABLE "giftcard" DROP COLUMN "batchId",
ADD COLUMN     "batchId" INTEGER;

-- AlterTable
ALTER TABLE "giftcard_batch" DROP CONSTRAINT "giftcard_batch_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "giftcard_batch_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "batchId",
ADD COLUMN     "batchId" INTEGER;

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giftcard_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giftcard_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
