'use server';

import { buyerActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const getSearchPreferencesOutputSchema = z.object({
  success: z.literal(true),
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
  allowSearchPreferences: z.boolean(),
  allowBuyRateAdjustment: z.boolean(),
  buyRate: z.number().nullable(),
});

export const getUserSearchPreferences = buyerActionClient.outputSchema(getSearchPreferencesOutputSchema).action(async ({ ctx }) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: {
      minAmountPreference: true,
      maxAmountPreference: true,
      allowSearchPreferences: true,
      allowBuyRateAdjustment: true,
    },
  });

  if (!user) {
    return {
      success: true as const,
      minAmount: null,
      maxAmount: null,
      allowSearchPreferences: false,
      allowBuyRateAdjustment: false,
      buyRate: null,
    };
  }

  return {
    success: true as const,
    minAmount: user.minAmountPreference ? Number(user.minAmountPreference) : null,
    maxAmount: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
    allowSearchPreferences: user.allowSearchPreferences,
    allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    buyRate: null,
  };
});
