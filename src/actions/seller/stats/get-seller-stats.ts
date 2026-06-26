'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sellerActionClient, ActionError } from '@/lib/safe-action';

const sellerStatsOutputSchema = z.object({
  totalCards: z.number(),
  totalBatches: z.number(),
  paidBatches: z.number(),
  unpaidBatches: z.number(),
});

export const getSellerStats = sellerActionClient.outputSchema(sellerStatsOutputSchema).action(async ({ ctx }) => {
  try {
    const userId = ctx.auth.user.id;

    const totalCards = await prisma.giftcard.count({
      where: {
        batch: { userId },
      },
    });
    const totalBatches = await prisma.giftcardBatch.count({
      where: { userId },
    });
    const paidBatches = await prisma.giftcardBatch.count({
      where: { userId, isPaid: true },
    });
    const unpaidBatches = await prisma.giftcardBatch.count({
      where: { userId, isPaid: false },
    });

    return {
      totalCards,
      totalBatches,
      paidBatches,
      unpaidBatches,
    };
  } catch (error) {
    console.error('[getSellerStats]', error);
    throw new ActionError('Error al obtener las estadísticas.');
  }
});
