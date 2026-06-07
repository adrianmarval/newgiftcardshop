-- DropForeignKey
ALTER TABLE "giftcard_batch" DROP CONSTRAINT "giftcard_batch_userId_fkey";

-- AddForeignKey
ALTER TABLE "giftcard_batch" ADD CONSTRAINT "giftcard_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
