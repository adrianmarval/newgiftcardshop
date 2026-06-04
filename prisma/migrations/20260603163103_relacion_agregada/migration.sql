/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `telegram_user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order" ADD COLUMN     "brandCountryId" TEXT;

-- AlterTable
ALTER TABLE "telegram_user" DROP COLUMN "photoUrl",
ADD COLUMN     "photoData" BYTEA,
ADD COLUMN     "photoMimeType" TEXT;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "brand_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
