-- Elimina el digest de stock (resumen periódico): la cola, el intervalo por marca
-- y lo reemplaza con un toggle por usuario (stockAlertsEnabled) que decide si
-- STOCK_AVAILABLE sale por Telegram/Push al instante o solo queda in-app.

-- AlterTable
ALTER TABLE "brand_country" DROP COLUMN "stockDigestIntervalMinutes";

-- AlterTable
ALTER TABLE "notification_preference" ADD COLUMN "stockAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "stock_digest_queue";
