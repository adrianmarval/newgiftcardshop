'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { savePushSubscriptionInputSchema, savePushSubscriptionOutputSchema } from './schemas';

export const savePushSubscription = authActionClient
  .inputSchema(savePushSubscriptionInputSchema)
  .outputSchema(savePushSubscriptionOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const userId = ctx.auth.user.id;
    const { endpoint, p256dh, auth, userAgent } = parsedInput;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth, userAgent: userAgent ?? null },
      create: { userId, endpoint, p256dh, auth, userAgent: userAgent ?? null },
    });

    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushEnabled: true },
      create: { userId, pushEnabled: true },
    });

    return { success: true as const };
  });
