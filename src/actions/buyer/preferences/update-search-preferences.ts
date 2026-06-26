'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateSearchPreferencesInputSchema = z.object({
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});
const updateSearchPreferencesOutputSchema = z.object({ success: z.literal(true) });

export const updateSearchPreferences = buyerActionClient.inputSchema(updateSearchPreferencesInputSchema).outputSchema(updateSearchPreferencesOutputSchema).action(async function ({
  parsedInput: { minAmount, maxAmount },
  ctx,
}) {
  try {
    await prisma.user.update({
      where: { id: ctx.auth.user.id },
      data: {
        minAmountPreference: minAmount,
        maxAmountPreference: maxAmount,
      },
    });

    return { success: true as const };
  } catch (error) {
    console.error('Update search preferences error:', error);
    throw new ActionError('Failed to update preferences');
  }
});
