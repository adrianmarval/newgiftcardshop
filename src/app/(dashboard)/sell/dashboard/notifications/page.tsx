import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/auth/authorization';
import { getNotificationPageData } from '@/lib/services/notification/page-queries';

export const metadata: Metadata = {
  title: 'Centro de Notificaciones | Portal Ventas',
  description: 'Seguí el estado de tus lotes vendidos, confirmaciones de pago y límites de volumen KYC.',
};

export default async function SellerNotificationsPage() {
  const session = await getSession();
  const { notifications, unreadCount, preference } = await getNotificationPageData(session.user.id);

  return (
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Notificaciones de Venta</h1>
        <p className="text-muted-foreground text-sm">Seguí tus liquidaciones de pagos y el estado de auditoría de tus lotes.</p>
      </div>
      <div className="mt-4">
        <NotificationsPageClient
          portal="seller"
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
          settingsProps={{
            portal: 'seller',
            telegramLinked: !!session.user.telegramUser,
            telegramProfileUrl: '/sell/dashboard/profile',
            initialPreferences: preference
              ? {
                  telegramEnabled: preference.telegramEnabled,
                  whatsappEnabled: preference.whatsappEnabled,
                  whatsappPhone: preference.whatsappPhone,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
