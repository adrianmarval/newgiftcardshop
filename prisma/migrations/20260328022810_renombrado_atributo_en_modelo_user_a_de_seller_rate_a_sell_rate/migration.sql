/*
  Warnings:

  - You are about to drop the column `sellerRate` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "sellerRate",
ADD COLUMN     "sellRate" DECIMAL(10,4);
