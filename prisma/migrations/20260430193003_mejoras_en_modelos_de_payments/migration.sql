/*
  Warnings:

  - You are about to drop the column `transactionType` on the `payment` table. All the data in the column will be lost.
  - Added the required column `category` to the `payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direction` to the `payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('ORDER', 'BATCH', 'DEPOSIT', 'REFUND_BUYER', 'REFUND_SELLER');

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "transactionType",
ADD COLUMN     "category" "PaymentCategory" NOT NULL,
ADD COLUMN     "direction" "PaymentDirection" NOT NULL;

-- DropEnum
DROP TYPE "TransactionType";
