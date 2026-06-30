'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { toggleCoinActiveInputSchema, toggleCoinActiveOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const toggleCoinActive = adminActionClient
  .inputSchema(toggleCoinActiveInputSchema)
  .outputSchema(toggleCoinActiveOutputSchema)
  .action(async ({ parsedInput: { id, isActive } }) => {
    await prisma.coin.update({ where: { id }, data: { isActive } });
    invalidateCache();
    return { success: true as const };
  });
