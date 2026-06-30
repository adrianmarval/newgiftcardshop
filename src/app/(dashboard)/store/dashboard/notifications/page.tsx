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
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Notificaciones</h1>
        <p className="text-muted-foreground text-sm">
          Seguí el estado de tus compras y Notificaciones de marcas disponibles en tiempo real.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsPageClient
          portal="buyer"
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
          settingsProps={{
            portal: 'buyer',
            telegramLinked: !!session.user.telegramUser,
            telegramProfileUrl: '/store/dashboard/account',
            initialPreferences: preference
              ? {
                  telegramEnabled: preference.telegramEnabled,
                  whatsappEnabled: preference.whatsappEnabled,
                  whatsappPhone: preference.whatsappPhone,
                }
              : undefined,
            brandCountries,
          }}
        />
      </div>
    </div>
  );
}
