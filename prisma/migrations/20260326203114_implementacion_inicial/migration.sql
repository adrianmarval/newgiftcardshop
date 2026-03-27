-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SELLER', 'BUYER');

-- CreateEnum
CREATE TYPE "GiftCardBrand" AS ENUM ('AMAZON', 'EBAY', 'WALMART', 'TARGET', 'BEST_BUY', 'HOME_DEPOT', 'LOWES', 'MACY_S', 'KOHLS', 'STEAM', 'PLAYSTATION_NETWORK', 'XBOX', 'NINTENDO_ESHOP', 'ROBLOX', 'RAZER_GOLD', 'APPLE_ITUNES', 'GOOGL_PLAY', 'NETFLIX', 'HULU', 'SPOTIFY', 'STARBUCKS', 'CHIPOTLE', 'DOMINOS', 'UBER_EATS', 'DOORDASH', 'CHEESECAKE_FACTORY', 'NIKE', 'ADIDAS', 'SEPHORA', 'VANILLA_VISA');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GiftcardStatus" AS ENUM ('USED', 'UNUSED', 'ALREADY_USED', 'INVALID', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "SupportedNetworks" AS ENUM ('BSC', 'TRX', 'MATIC', 'AVAXC', 'PLASMA');

-- CreateEnum
CREATE TYPE "SupportedCoins" AS ENUM ('USDT');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "buyRate" DECIMAL(10,4),
ADD COLUMN     "role" "Role"[] DEFAULT ARRAY['BUYER']::"Role"[],
ADD COLUMN     "sellerRate" DECIMAL(10,4);

-- CreateTable
CREATE TABLE "giftcard" (
    "id" TEXT NOT NULL,
    "brand" "GiftCardBrand" NOT NULL,
    "claimCode" TEXT NOT NULL,
    "pinCode" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "status" "GiftcardStatus" NOT NULL DEFAULT 'UNUSED',
    "ownerId" TEXT,
    "countryId" TEXT,
    "orderId" TEXT,
    "batchId" TEXT,

    CONSTRAINT "giftcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giftcard_batch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giftcard_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "orderId" TEXT,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" TEXT NOT NULL,
    "coin" "SupportedCoins" NOT NULL,
    "address" TEXT NOT NULL,
    "network" "SupportedNetworks" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "giftcard_claimCode_key" ON "giftcard"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "country_name_key" ON "country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_userId_key" ON "payment_method"("userId");

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giftcard" ADD CONSTRAINT "giftcard_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giftcard_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giftcard_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
