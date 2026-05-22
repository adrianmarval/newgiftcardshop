'use server';

import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateSearchPreferencesInputSchema = z.object({
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});

export const updateSearchPreferences = authActionClient.inputSchema(updateSearchPreferencesInputSchema).action(async function ({
  parsedInput: { minAmount, maxAmount },
}) {
  try {
    const headersList = await headers();
    const session = await import('@/lib/auth').then((m) => m.auth.api.getSession({ headers: headersList }));

    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        minAmountPreference: minAmount,
        maxAmountPreference: maxAmount,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Update search preferences error:', error);
    return { error: 'Failed to update preferences' };
  }
});
