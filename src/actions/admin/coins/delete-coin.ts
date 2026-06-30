'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { deleteCoinInputSchema, deleteCoinOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const deleteCoin = adminActionClient
  .inputSchema(deleteCoinInputSchema)
  .outputSchema(deleteCoinOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.coin.delete({ where: { id } });
    invalidateCache();
    return { success: true as const };
  });
