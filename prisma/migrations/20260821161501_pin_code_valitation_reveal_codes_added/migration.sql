-- AlterTable
ALTER TABLE "user" ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securityPinHash" TEXT,
ADD COLUMN     "securityUnlockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pin_reset_otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_reset_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pin_reset_otp_userId_key" ON "pin_reset_otp"("userId");

-- AddForeignKey
ALTER TABLE "pin_reset_otp" ADD CONSTRAINT "pin_reset_otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
