'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';

const getUnreadCountOutputSchema = z.object({ success: z.literal(true), count: z.number() });

export const getUnreadCount = authActionClient.outputSchema(getUnreadCountOutputSchema).action(async ({ ctx }) => {
  const count = await prisma.notification.count({
    where: {
      userId: ctx.auth.user.id,
      read: false,
    },
  });

  return { success: true as const, count };
});
