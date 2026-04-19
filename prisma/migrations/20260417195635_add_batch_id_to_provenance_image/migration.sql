-- DropForeignKey
ALTER TABLE "provenance_image" DROP CONSTRAINT "provenance_image_giftcardId_fkey";

-- DropIndex
DROP INDEX "provenance_image_giftcardId_key";

-- AlterTable
ALTER TABLE "giftcard" ADD COLUMN     "provenanceImageId" TEXT;

-- AlterTable
ALTER TABLE "provenance_image" ADD COLUMN     "batchId" TEXT,
ALTER COLUMN "giftcardId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_provenanceImageId_fkey" FOREIGN KEY ("provenanceImageId") REFERENCES "provenance_image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
