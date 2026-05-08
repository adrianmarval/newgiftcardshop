/*
  Warnings:

  - The primary key for the `bot_session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `bot_session` table. All the data in the column will be lost.
  - You are about to drop the column `session` on the `bot_session` table. All the data in the column will be lost.
  - You are about to drop the `telegram_link_token` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `key` to the `bot_session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `bot_session` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "telegram_link_token" DROP CONSTRAINT "telegram_link_token_userId_fkey";

-- AlterTable
ALTER TABLE "bot_session" DROP CONSTRAINT "bot_session_pkey",
DROP COLUMN "id",
DROP COLUMN "session",
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "value" TEXT NOT NULL,
ADD CONSTRAINT "bot_session_pkey" PRIMARY KEY ("key");

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "telegramUsername" TEXT;

-- DropTable
DROP TABLE "telegram_link_token";

-- CreateTable
CREATE TABLE "telegram_otp" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_otp_telegramId_key" ON "telegram_otp"("telegramId");
