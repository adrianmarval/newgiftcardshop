'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { markTourSeenInputSchema, markTourSeenOutputSchema } from './schemas';

/**
 * Append idempotente del tourId al array JSON `toursSeen` del usuario.
 * Se llama tanto al completar como al skipear un tour — si lo cerró, no se le vuelve a molestar.
 */
export const markTourSeen = authActionClient
  .inputSchema(markTourSeenInputSchema)
  .outputSchema(markTourSeenOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const userId = ctx.auth.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { toursSeen: true },
    });

    const current = Array.isArray(user?.toursSeen) ? (user.toursSeen as string[]) : [];
    if (current.includes(parsedInput.tourId)) {
      return { success: true as const, toursSeen: current };
    }

    const toursSeen = [...current, parsedInput.tourId];
    await prisma.user.update({
      where: { id: userId },
      data: { toursSeen },
    });

    return { success: true as const, toursSeen };
  });
