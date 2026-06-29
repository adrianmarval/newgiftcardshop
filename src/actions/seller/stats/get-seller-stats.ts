'use server';

import { sellerActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { sellerStatsOutputSchema } from './schemas';

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