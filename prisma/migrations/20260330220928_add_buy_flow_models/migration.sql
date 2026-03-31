-- CreateEnum
CREATE TYPE "GiftcardIssueType" AS ENUM ('INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT');

-- AlterEnum
ALTER TYPE "GiftcardStatus" ADD VALUE 'WRONG_AMOUNT';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "giftcard" ADD COLUMN     "reportedAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "adjustedTotal" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "giftcard_issue" (
    "id" TEXT NOT NULL,
    "issueType" "GiftcardIssueType" NOT NULL,
    "reportedAmount" DECIMAL(10,2),
    "proofImageUrl" TEXT,
    "giftcardId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "sellerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giftcard_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- AddForeignKey
ALTER TABLE "giftcard_issue" ADD CONSTRAINT "giftcard_issue_giftcardId_fkey" FOREIGN KEY ("giftcardId") REFERENCES "giftcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard_issue" ADD CONSTRAINT "giftcard_issue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard_issue" ADD CONSTRAINT "giftcard_issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
