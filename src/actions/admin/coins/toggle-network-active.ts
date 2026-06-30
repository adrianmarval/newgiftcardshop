'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { toggleNetworkActiveInputSchema, toggleNetworkActiveOutputSchema } from './schemas';
import { invalidateCache } from '@/lib/services/coin';

export const toggleNetworkActive = adminActionClient
  .inputSchema(toggleNetworkActiveInputSchema)
  .outputSchema(toggleNetworkActiveOutputSchema)
  .action(async ({ parsedInput: { id, isActive } }) => {
    await prisma.network.update({ where: { id }, data: { isActive } });
    invalidateCache();
    return { success: true as const };
  });
