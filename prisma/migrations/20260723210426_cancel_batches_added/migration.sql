-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BATCH_CANCELLED';

-- AlterTable
ALTER TABLE "giftcard_batch" ADD COLUMN     "cancelledAt" TIMESTAMP(3);
