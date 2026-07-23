import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/auth/authorization';
import { getNotificationPageData } from '@/lib/services/notification/page-queries';

export const metadata: Metadata = {
  title: 'Notifications Center | Seller Portal',
  description: 'Track your sold batches, payment confirmations, and KYC volume limits.',
};

export default async function SellerNotificationsPage() {
  const session = await getSession();
  const { notifications, unreadCount, preference } = await getNotificationPageData(session.user.id);

  return (
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Sales Notifications</h1>
        <p className="text-muted-foreground text-sm">Track your payment settlements and batch audit status.</p>
      </div>
      <div className="mt-4">
        <NotificationsPageClient
          portal="seller"
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
          settingsProps={{
            portal: 'seller',
            telegramLinked: !!session.user.telegramUser,
            telegramProfileUrl: '/sell/dashboard/account',
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
