'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { createCoinInputSchema, createCoinOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const createCoin = adminActionClient
  .inputSchema(createCoinInputSchema)
  .outputSchema(createCoinOutputSchema)
  .action(async ({ parsedInput }) => {
    const coin = await prisma.coin.create({ data: parsedInput });
    invalidateCache();
    return { success: true as const, coin };
  });
