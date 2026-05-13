-- AlterTable
ALTER TABLE "provenance_image" ADD COLUMN     "telegramFileId" TEXT,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL,
ALTER COLUMN "size" DROP NOT NULL;
