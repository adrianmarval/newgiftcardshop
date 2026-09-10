import prisma from '@/lib/prisma';

export async function listUserNotifications(
  userId: string,
  input: { page: number; limit: number; filter: string },
): Promise<{
  notifications: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    read: boolean;
    actionUrl: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const { page, limit, filter } = input;
  const skip = (page - 1) * limit;

  const where: { userId: string; read?: boolean } = {
    userId,
  };
  if (filter === 'unread') where.read = false;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      type: n.type,
      read: n.read,
      actionUrl: n.actionUrl,
      metadata: n.metadata as Record<string, unknown> | null,
      createdAt: n.createdAt,
    })),
    total,
    page,
    limit,
    hasMore: skip + notifications.length < total,
  };
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
