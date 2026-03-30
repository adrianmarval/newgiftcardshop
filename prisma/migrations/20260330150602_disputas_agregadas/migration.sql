-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('OVERPAID', 'UNDERPAID');

-- AlterTable
ALTER TABLE "giftcard" ADD COLUMN     "reportedAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "confirmedTotal" DECIMAL(10,2),
ADD COLUMN     "disputeDifference" DECIMAL(10,2),
ADD COLUMN     "disputeNotes" TEXT,
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "disputeType" "DisputeType";
