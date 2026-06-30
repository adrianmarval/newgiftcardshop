'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { revokeOtherSessionsOutputSchema } from './session-schemas';

export const revokeOtherSessions = authActionClient
  .outputSchema(revokeOtherSessionsOutputSchema)
  .action(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    // Find the current session by looking for the most recently updated one
    // (Better Auth touches updatedAt on each request)
    const currentSession = await prisma.session.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    const result = await prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentSession?.id ?? '' },
      },
    });

    return { success: true as const, revokedCount: result.count };
  });
