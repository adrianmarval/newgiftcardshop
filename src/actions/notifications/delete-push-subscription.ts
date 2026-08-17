'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { deletePushSubscriptionInputSchema, deletePushSubscriptionOutputSchema } from './schemas';

export const deletePushSubscription = authActionClient
  .inputSchema(deletePushSubscriptionInputSchema)
  .outputSchema(deletePushSubscriptionOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const userId = ctx.auth.user.id;
    const { endpoint } = parsedInput;

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });

    const remaining = await prisma.pushSubscription.count({ where: { userId } });
    if (remaining === 0) {
      await prisma.notificationPreference.updateMany({
        where: { userId },
        data: { pushEnabled: false },
      });
    }

    return { success: true as const };
  });
