import { NotificationsView, NotificationItemType } from '@/components/notifications/notifications-view';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Centro de Alertas | Portal Ventas',
  description: 'Seguí el estado de tus lotes vendidos, confirmaciones de pago y límites de volumen KYC.',
};

export default async function SellerNotificationsPage() {
  const session = await getSession();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  return (
    <div className="w-full space-y-1 p-1 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Alertas de Venta</h1>
        <p className="text-muted-foreground text-sm">Seguí tus liquidaciones de pagos y el estado de auditoría de tus lotes.</p>
      </div>
      <div className="mt-4">
        <NotificationsView
          portal="seller"
          initialNotifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            description: n.description,
            createdAt: n.createdAt,
            read: n.read,
            type: n.type as NotificationItemType,
            actionUrl: n.actionUrl,
            metadata: n.metadata as Record<string, unknown> | null,
          }))}
          initialUnreadCount={unreadCount}
        />
      </div>
    </div>
  );
}
