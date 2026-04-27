-- AlterTable
ALTER TABLE "user" ADD COLUMN     "creditLimit" DECIMAL(10,2) NOT NULL DEFAULT 200,
ADD COLUMN     "fixedAmountsPreference" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxAmountPreference" DECIMAL(10,2),
ADD COLUMN     "minAmountPreference" DECIMAL(10,2);
