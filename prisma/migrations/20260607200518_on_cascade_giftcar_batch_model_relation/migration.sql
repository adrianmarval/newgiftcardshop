-- DropForeignKey
ALTER TABLE "giftcard" DROP CONSTRAINT "giftcard_batchId_fkey";

-- DropForeignKey
ALTER TABLE "giftcard_batch" DROP CONSTRAINT "giftcard_batch_userId_fkey";

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giftcard_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard_batch" ADD CONSTRAINT "giftcard_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
