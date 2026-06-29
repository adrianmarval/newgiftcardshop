'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { markAsReadInputSchema, markAsReadOutputSchema } from './schemas';

export const markAsRead = authActionClient
  .inputSchema(markAsReadInputSchema)
  .outputSchema(markAsReadOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { notificationId, all } = parsedInput;
    const userId = ctx.auth.user.id;

    if (all) {
      const result = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return { success: true as const, updated: result.count };
    }

    if (notificationId) {
      const result = await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
      });
      if (result.count === 0) {
        return { success: false as const, error: 'Notification not found' };
      }
      return { success: true as const, updated: 1 };
    }

    return { success: false as const, error: 'Either notificationId or all must be provided' };
  });