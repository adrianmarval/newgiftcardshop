-- sell-flow: Remove price, add encryption support, rate snapshots

-- DropIndex
DROP INDEX "giftcard_claimCode_key";

-- AlterTable: Giftcard
ALTER TABLE "giftcard" DROP COLUMN "price",
ADD COLUMN     "codeHash" TEXT;

-- AlterTable: GiftcardBatch
ALTER TABLE "giftcard_batch" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellRate" DECIMAL(10,4);

-- AlterTable: Order
ALTER TABLE "order" ADD COLUMN     "buyRate" DECIMAL(10,4);

-- CreateIndex
CREATE UNIQUE INDEX "giftcard_codeHash_key" ON "giftcard"("codeHash");
