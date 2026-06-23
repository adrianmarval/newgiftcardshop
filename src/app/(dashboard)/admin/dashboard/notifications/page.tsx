import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import type { NotificationItem } from '@/components/notifications/notifications-page-client';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Consola de Notificaciones | Panel Administrador',
  description: 'Auditoría de nuevos lotes, confirmaciones de pago pendientes y control de inventario.',
};

export default async function AdminNotificationsPage() {
  const session = await getSession();

  const [notifications, unreadCount, preference] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
    prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
      select: { telegramEnabled: true, whatsappEnabled: true, whatsappPhone: true },
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
        <NotificationsPageClient
          portal="admin"
          initialNotifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            description: n.description,
            createdAt: n.createdAt,
            read: n.read,
            type: n.type as NotificationItem['type'],
            actionUrl: n.actionUrl,
            metadata: n.metadata as Record<string, unknown> | null,
          }))}
          initialUnreadCount={unreadCount}
          settingsProps={{
            portal: 'admin',
            telegramLinked: !!session.user.telegramUser,
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
