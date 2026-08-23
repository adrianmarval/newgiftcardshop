import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/auth/authorization';
import { getNotificationPageData } from '@/lib/services/notification/page-queries';

export const metadata: Metadata = {
  title: `Notifications | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Track your sold batches, payment confirmations, and KYC volume limits.',
};

export default async function SellerNotificationsPage() {
  const session = await getSession();
  const { notifications, unreadCount, preference } = await getNotificationPageData(session.user.id);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
      <NotificationsPageClient
        portal="seller"
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        settingsProps={{
          portal: 'seller',
          telegramLinked: !!session.user.telegramUser,
          initialPreferences: preference
            ? {
                telegramEnabled: preference.telegramEnabled,
                pushEnabled: preference.pushEnabled,
              }
            : undefined,
        }}
      />
    </div>
  );
}
