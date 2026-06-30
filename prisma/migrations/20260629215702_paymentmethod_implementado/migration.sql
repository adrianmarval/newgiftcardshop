/*
  Warnings:

  - You are about to drop the column `coin` on the `payment_method` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `payment_method` table. All the data in the column will be lost.
  - Added the required column `coinId` to the `payment_method` table without a default value. This is not possible if the table is not empty.
  - Added the required column `networkId` to the `payment_method` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_method" DROP COLUMN "coin",
DROP COLUMN "network",
ADD COLUMN     "coinId" TEXT NOT NULL,
ADD COLUMN     "isBinanceWallet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "networkId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "SupportedCoins";

-- DropEnum
DROP TYPE "SupportedNetworks";

-- CreateTable
CREATE TABLE "coin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 6,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "regex" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_network" (
    "id" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,

    CONSTRAINT "coin_network_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_symbol_key" ON "coin"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "network_name_key" ON "network"("name");

-- CreateIndex
CREATE UNIQUE INDEX "coin_network_coinId_networkId_key" ON "coin_network"("coinId", "networkId");

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "coin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_network" ADD CONSTRAINT "coin_network_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "coin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_network" ADD CONSTRAINT "coin_network_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE CASCADE ON UPDATE CASCADE;
