'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

const deleteBatchInputSchema = z.object({ batchId: z.number().int().positive() });

export const deleteBatch = adminActionClient.inputSchema(deleteBatchInputSchema).action(async ({ parsedInput }) => {
  const { batchId } = parsedInput;

  const cardsWithOrders = await prisma.giftcard.findMany({
    where: { batchId },
    select: { orderId: true },
  });

  const hasOrders = cardsWithOrders.some((c) => c.orderId !== null);
  if (hasOrders) {
    return { success: false as const, error: 'Cannot delete batch with cards that have orders' };
  }

  await prisma.giftcard.deleteMany({ where: { batchId } });
  await prisma.giftcardBatch.delete({ where: { id: batchId } });

  return { success: true as const };
});
