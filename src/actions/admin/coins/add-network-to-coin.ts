'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { addNetworkToCoinInputSchema, addNetworkToCoinOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const addNetworkToCoin = adminActionClient
  .inputSchema(addNetworkToCoinInputSchema)
  .outputSchema(addNetworkToCoinOutputSchema)
  .action(async ({ parsedInput: { coinId, networkId } }) => {
    await prisma.coinNetwork.create({ data: { coinId, networkId } });
    invalidateCache();
    return { success: true as const };
  });
