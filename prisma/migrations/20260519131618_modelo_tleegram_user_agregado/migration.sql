/*
  Warnings:

  - You are about to drop the column `telegramId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `telegramUsername` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_telegramId_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "telegramId",
DROP COLUMN "telegramUsername";

-- CreateTable
CREATE TABLE "telegram_user" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "languageCode" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_user_telegramId_key" ON "telegram_user"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_user_userId_key" ON "telegram_user"("userId");

-- AddForeignKey
ALTER TABLE "telegram_user" ADD CONSTRAINT "telegram_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
