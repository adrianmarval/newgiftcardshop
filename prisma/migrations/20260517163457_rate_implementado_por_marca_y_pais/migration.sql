/*
  Warnings:

  - You are about to drop the column `buyRate` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `sellRate` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "buyRate",
DROP COLUMN "sellRate";

-- CreateTable
CREATE TABLE "brand_country_rate" (
    "id" TEXT NOT NULL,
    "brandCountryId" TEXT NOT NULL,
    "buyRate" DECIMAL(10,4) NOT NULL,
    "sellRate" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_country_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_brand_country_rate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandCountryId" TEXT NOT NULL,
    "buyRate" DECIMAL(10,4) NOT NULL,
    "sellRate" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_brand_country_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_country_rate_brandCountryId_key" ON "brand_country_rate"("brandCountryId");

-- CreateIndex
CREATE UNIQUE INDEX "user_brand_country_rate_userId_brandCountryId_key" ON "user_brand_country_rate"("userId", "brandCountryId");

-- AddForeignKey
ALTER TABLE "brand_country_rate" ADD CONSTRAINT "brand_country_rate_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "brand_country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_brand_country_rate" ADD CONSTRAINT "user_brand_country_rate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_brand_country_rate" ADD CONSTRAINT "user_brand_country_rate_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "brand_country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
