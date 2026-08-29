-- AlterTable
ALTER TABLE "brand_country" ADD COLUMN     "stockDigestIntervalMinutes" INTEGER;

-- CreateTable
CREATE TABLE "stock_digest_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandCountryId" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "firstEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_digest_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_digest_queue_userId_brandCountryId_key" ON "stock_digest_queue"("userId", "brandCountryId");

-- AddForeignKey
ALTER TABLE "stock_digest_queue" ADD CONSTRAINT "stock_digest_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_digest_queue" ADD CONSTRAINT "stock_digest_queue_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "brand_country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
