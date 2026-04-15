-- CreateTable
CREATE TABLE "provenance_image" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "giftcardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provenance_image_giftcardId_key" ON "provenance_image"("giftcardId");

-- AddForeignKey
ALTER TABLE "provenance_image" ADD CONSTRAINT "provenance_image_giftcardId_fkey" FOREIGN KEY ("giftcardId") REFERENCES "giftcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
