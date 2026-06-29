'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { deleteCardInputSchema, deleteCardOutputSchema } from './schemas';

export const deleteCard = adminActionClient
  .inputSchema(deleteCardInputSchema)
  .outputSchema(deleteCardOutputSchema)
  .action(async ({ parsedInput }) => {
    const { cardId } = parsedInput;

    const card = await prisma.giftcard.findUnique({
      where: { id: cardId },
      select: { orderId: true },
    });

    if (!card) {
      return { success: false as const, error: 'Card not found' };
    }

    if (card.orderId !== null) {
      return { success: false as const, error: 'Cannot delete card that has an order' };
    }

    await prisma.giftcard.delete({ where: { id: cardId } });

    return { success: true as const };
  });