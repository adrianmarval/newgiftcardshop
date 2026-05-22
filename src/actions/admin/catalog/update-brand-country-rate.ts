'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateBrandCountryRateInputSchema = z.object({
  brandCountryId: z.string(),
  buyRate: z.number().min(0).max(1),
  sellRate: z.number().min(0).max(1),
});

export const updateBrandCountryRate = adminActionClient.inputSchema(updateBrandCountryRateInputSchema).action(async ({ parsedInput }) => {
  const { brandCountryId, buyRate, sellRate } = parsedInput;

  await prisma.brandCountryRate.upsert({
    where: { brandCountryId },
    create: {
      brandCountryId,
      buyRate,
      sellRate,
    },
    update: {
      buyRate,
      sellRate,
    },
  });

  return { success: true as const };
});
