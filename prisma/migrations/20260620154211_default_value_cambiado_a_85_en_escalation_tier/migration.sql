/*
  Warnings:

  - You are about to drop the `brand_country_rate` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "brand_country_rate" DROP CONSTRAINT "brand_country_rate_brandCountryId_fkey";

-- AlterTable
ALTER TABLE "giftcard" ALTER COLUMN "escalationTier" SET DEFAULT 85;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "telegram_otp" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "brand_country_rate";

-- CreateIndex
CREATE UNIQUE INDEX "order_idempotencyKey_key" ON "order"("idempotencyKey");
