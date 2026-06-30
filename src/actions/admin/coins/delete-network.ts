'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { deleteNetworkInputSchema, deleteNetworkOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const deleteNetwork = adminActionClient
  .inputSchema(deleteNetworkInputSchema)
  .outputSchema(deleteNetworkOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.network.delete({ where: { id } });
    invalidateCache();
    return { success: true as const };
  });
