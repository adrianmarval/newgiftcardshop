-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED';
