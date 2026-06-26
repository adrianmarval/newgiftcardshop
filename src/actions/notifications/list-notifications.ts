'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';

const listNotificationsInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  filter: z.enum(['all', 'unread']).optional().default('all'),
});

const listNotificationsOutputSchema = z.object({
  success: z.literal(true),
  notifications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      type: z.string(),
      read: z.boolean(),
      actionUrl: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
      createdAt: z.date(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
});

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
