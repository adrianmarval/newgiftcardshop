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
    <div className="flex min-h-0 flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
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
  );
}
