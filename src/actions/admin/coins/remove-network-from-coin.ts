'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { removeNetworkFromCoinInputSchema, removeNetworkFromCoinOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const removeNetworkFromCoin = adminActionClient
  .inputSchema(removeNetworkFromCoinInputSchema)
  .outputSchema(removeNetworkFromCoinOutputSchema)
  .action(async ({ parsedInput: { coinId, networkId } }) => {
    await prisma.coinNetwork.deleteMany({ where: { coinId, networkId } });
    invalidateCache();
    return { success: true as const };
  });
