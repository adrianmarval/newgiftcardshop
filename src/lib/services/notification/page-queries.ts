import prisma from '@/lib/prisma';
import type { NotificationItem, NotificationPageData } from '@/types';

export async function getNotificationPageData(userId: string): Promise<NotificationPageData> {
  const [rawNotifications, unreadCount, preference] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { telegramEnabled: true, whatsappEnabled: true, whatsappPhone: true, pushEnabled: true },
    }),
  ]);

  const notifications: NotificationItem[] = rawNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    createdAt: n.createdAt,
    read: n.read,
    type: n.type as NotificationItem['type'],
    actionUrl: n.actionUrl,
    metadata: n.metadata as Record<string, unknown> | null,
  }));

  return { notifications, unreadCount, preference };
}
