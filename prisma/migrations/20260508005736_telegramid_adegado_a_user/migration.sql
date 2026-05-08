/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "telegramId" TEXT;

-- CreateTable
CREATE TABLE "bot_session" (
    "id" TEXT NOT NULL,
    "session" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_token_token_key" ON "telegram_link_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_token_userId_key" ON "telegram_link_token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_telegramId_key" ON "user"("telegramId");

-- AddForeignKey
ALTER TABLE "telegram_link_token" ADD CONSTRAINT "telegram_link_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
