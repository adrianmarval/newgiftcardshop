'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getUnreadCountOutputSchema } from './schemas';

export const getUnreadCount = authActionClient.outputSchema(getUnreadCountOutputSchema).action(async ({ ctx }) => {
  const count = await prisma.notification.count({
    where: {
      userId: ctx.auth.user.id,
      read: false,
    },
  });

  return { success: true as const, count };
});