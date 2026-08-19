-- CreateTable
CREATE TABLE "telegram_link_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_token_token_key" ON "telegram_link_token"("token");

-- CreateIndex
CREATE INDEX "telegram_link_token_token_idx" ON "telegram_link_token"("token");

-- AddForeignKey
ALTER TABLE "telegram_link_token" ADD CONSTRAINT "telegram_link_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
