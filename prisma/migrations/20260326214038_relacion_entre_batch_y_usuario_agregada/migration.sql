-- AlterTable
ALTER TABLE "giftcard_batch" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "giftcard_batch" ADD CONSTRAINT "giftcard_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
