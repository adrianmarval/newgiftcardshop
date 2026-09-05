-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PENDING_ORDER_ALERT';

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "lastPendingOrderAlertAt" TIMESTAMP(3);
