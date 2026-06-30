'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { createNetworkInputSchema, createNetworkOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const createNetwork = adminActionClient
  .inputSchema(createNetworkInputSchema)
  .outputSchema(createNetworkOutputSchema)
  .action(async ({ parsedInput }) => {
    const network = await prisma.network.create({ data: parsedInput });
    invalidateCache();
    return { success: true as const, network };
  });
