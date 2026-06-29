'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { listNotificationsInputSchema, listNotificationsOutputSchema } from './schemas';

export const listNotifications = authActionClient
  .inputSchema(listNotificationsInputSchema)
  .outputSchema(listNotificationsOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { page, limit, filter } = parsedInput;
    const skip = (page - 1) * limit;

    const where: { userId: string; read?: boolean } = {
      userId: ctx.auth.user.id,
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
      success: true as const,
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
  });