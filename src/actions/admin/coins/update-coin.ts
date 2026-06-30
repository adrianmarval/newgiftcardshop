'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { updateCoinInputSchema, updateCoinOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const updateCoin = adminActionClient
  .inputSchema(updateCoinInputSchema)
  .outputSchema(updateCoinOutputSchema)
  .action(async ({ parsedInput: { id, ...data } }) => {
    const coin = await prisma.coin.update({ where: { id }, data });
    invalidateCache();
    return { success: true as const, coin };
  });
