'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getActiveSessionsOutputSchema } from './session-schemas';

export const getActiveSessions = authActionClient
  .outputSchema(getActiveSessionsOutputSchema)
  .action(async ({ ctx }) => {
    const sessions = await prisma.session.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return { success: true as const, sessions };
  });
