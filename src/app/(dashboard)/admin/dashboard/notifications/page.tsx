import { NotificationsView, NotificationItemType } from '@/components/notifications/notifications-view';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Consola de Alertas | Panel Administrador',
  description: 'Auditoría de nuevos lotes, confirmaciones de pago pendientes y control de inventario.',
};

export default async function AdminNotificationsPage() {
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
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">Consola de Operaciones</h1>
        <p className="text-muted-foreground text-sm">
          Monitoreá las solicitudes críticas de usuarios, auditorías de lotes e inventario del sitio.
        </p>
      </div>
      <div className="mt-4">
        <NotificationsView
          portal="admin"
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
