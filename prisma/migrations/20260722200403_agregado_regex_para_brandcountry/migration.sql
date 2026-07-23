/*
  Warnings:

  - You are about to drop the column `claim_code_pattern` on the `brand_country` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[binanceTxId]` on the table `payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "brand_country" DROP COLUMN "claim_code_pattern",
ADD COLUMN     "claimCodePattern" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_binanceTxId_key" ON "payment"("binanceTxId");
