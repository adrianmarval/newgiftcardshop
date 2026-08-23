-- AlterTable
ALTER TABLE "notification_preference" DROP COLUMN "whatsappEnabled",
DROP COLUMN "whatsappPhone";

-- DropTable
DROP TABLE "whatsapp_auth_state";

-- DropTable
DROP TABLE "whatsapp_session";
