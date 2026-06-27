-- CreateTable
CREATE TABLE "whatsapp_auth_state" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_auth_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_session" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "phoneNumber" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_log" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "flow" TEXT,
    "action" TEXT,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "error" JSONB,
    "ip" TEXT,

    CONSTRAINT "app_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_auth_state_key_key" ON "whatsapp_auth_state"("key");

-- CreateIndex
CREATE INDEX "app_log_level_idx" ON "app_log"("level");

-- CreateIndex
CREATE INDEX "app_log_source_idx" ON "app_log"("source");

-- CreateIndex
CREATE INDEX "app_log_flow_idx" ON "app_log"("flow");

-- CreateIndex
CREATE INDEX "app_log_userId_idx" ON "app_log"("userId");

-- CreateIndex
CREATE INDEX "app_log_timestamp_idx" ON "app_log"("timestamp");

-- CreateIndex
CREATE INDEX "app_log_source_flow_timestamp_idx" ON "app_log"("source", "flow", "timestamp");

-- CreateIndex
CREATE INDEX "giftcard_brandCountryId_inStock_status_idx" ON "giftcard"("brandCountryId", "inStock", "status");

-- CreateIndex
CREATE INDEX "giftcard_ownerId_idx" ON "giftcard"("ownerId");

-- CreateIndex
CREATE INDEX "giftcard_orderId_idx" ON "giftcard"("orderId");

-- CreateIndex
CREATE INDEX "giftcard_escalationTier_idx" ON "giftcard"("escalationTier");

-- CreateIndex
CREATE INDEX "order_userId_status_idx" ON "order"("userId", "status");

-- CreateIndex
CREATE INDEX "order_brandCountryId_idx" ON "order"("brandCountryId");

-- CreateIndex
CREATE INDEX "payment_orderId_idx" ON "payment"("orderId");

-- CreateIndex
CREATE INDEX "payment_batchId_idx" ON "payment"("batchId");

-- CreateIndex
CREATE INDEX "payment_status_category_idx" ON "payment"("status", "category");

-- AddForeignKey
ALTER TABLE "app_log" ADD CONSTRAINT "app_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
