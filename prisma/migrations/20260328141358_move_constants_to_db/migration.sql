/*
  Warnings:

  - You are about to drop the column `brand` on the `giftcard` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `country` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandId` to the `giftcard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "country" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "giftcard" DROP COLUMN "brand",
ADD COLUMN     "brandId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "GiftCardBrand";

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_slug_key" ON "brand"("slug");

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
