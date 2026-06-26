'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

const deleteCardInputSchema = z.object({ cardId: z.string() });
const deleteCardOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ success: z.literal(false), error: z.string() })]);

export const deleteCard = adminActionClient.inputSchema(deleteCardInputSchema).outputSchema(deleteCardOutputSchema).action(async ({ parsedInput }) => {
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
