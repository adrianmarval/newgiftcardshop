import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/auth/authorization';
import { getNotificationPageData } from '@/lib/services/notification/page-queries';
import { getSubscribedBrandCountries } from '@/lib/notifications';

export const metadata: Metadata = {
  title: 'Centro de Notificaciones | Portal Compras',
  description: 'Gestioná tus Notificaciones de stock, vencimiento de pagos y entrega de códigos.',
};

export default async function BuyerNotificationsPage() {
  const session = await getSession();
  const [{ notifications, unreadCount, preference }, brandCountries] = await Promise.all([
    getNotificationPageData(session.user.id),
    getSubscribedBrandCountries(session.user.id),
  ]);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
      <NotificationsPageClient
        portal="buyer"
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        settingsProps={{
          portal: 'buyer',
          telegramLinked: !!session.user.telegramUser,
          initialPreferences: preference
            ? {
                telegramEnabled: preference.telegramEnabled,
                pushEnabled: preference.pushEnabled,
              }
            : undefined,
          brandCountries,
        }}
      />
    </div>
  );
}
