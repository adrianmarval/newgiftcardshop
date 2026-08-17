import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/auth/authorization';
import { getNotificationPageData } from '@/lib/services/notification/page-queries';

export const metadata: Metadata = {
  title: 'Consola de Notificaciones | Panel Administrador',
  description: 'Auditoría de nuevos lotes, confirmaciones de pago pendientes y control de inventario.',
};

export default async function AdminNotificationsPage() {
  const session = await getSession();
  const { notifications, unreadCount, preference } = await getNotificationPageData(session.user.id);

  return (
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Consola de Operaciones</h1>
        <p className="text-muted-foreground text-sm">
          Monitoreá las solicitudes críticas de usuarios, auditorías de lotes e inventario del sitio.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsPageClient
          portal="admin"
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
          settingsProps={{
            portal: 'admin',
            telegramLinked: !!session.user.telegramUser,
            initialPreferences: preference
              ? {
                  telegramEnabled: preference.telegramEnabled,
                  whatsappEnabled: preference.whatsappEnabled,
                  whatsappPhone: preference.whatsappPhone,
                  pushEnabled: preference.pushEnabled,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
