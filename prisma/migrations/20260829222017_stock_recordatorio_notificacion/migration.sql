-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'STOCK_REMINDER';

-- AlterTable
ALTER TABLE "brand_country" ADD COLUMN     "stockReminderIntervalMinutes" INTEGER;

-- CreateTable
CREATE TABLE "stock_reminder_state" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandCountryId" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reminder_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_reminder_state_userId_brandCountryId_key" ON "stock_reminder_state"("userId", "brandCountryId");

-- AddForeignKey
ALTER TABLE "stock_reminder_state" ADD CONSTRAINT "stock_reminder_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reminder_state" ADD CONSTRAINT "stock_reminder_state_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "brand_country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
