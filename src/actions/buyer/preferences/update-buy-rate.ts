'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateBuyRateInputSchema = z.object({
  brandCountryId: z.string().min(1, 'Debe seleccionar una marca y país'),
  buyRate: z.number().min(0.8, 'La tarifa no puede ser inferior a 0.80 (80%)').max(1.0, 'La tarifa no puede ser superior a 1.00 (100%)'),
});
const updateBuyRateOutputSchema = z.object({ success: z.literal(true) });

export const updateBuyRate = buyerActionClient.inputSchema(updateBuyRateInputSchema).outputSchema(updateBuyRateOutputSchema).action(async function ({
  parsedInput: { brandCountryId, buyRate },
  ctx,
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: { allowBuyRateAdjustment: true },
    });

    if (!user?.allowBuyRateAdjustment) {
      throw new ActionError('No tienes permiso para ajustar tu tarifa');
    }

    const existingUserRate = await prisma.userBrandCountryRate.findUnique({
      where: {
        userId_brandCountryId: {
          userId: ctx.auth.user.id,
          brandCountryId,
        },
      },
      select: { sellRate: true },
    });

    if (!existingUserRate) {
      throw new ActionError('No tienes tarifa asignada para este brand-country. Contactá al administrador.');
    }

    await prisma.userBrandCountryRate.upsert({
      where: {
        userId_brandCountryId: {
          userId: ctx.auth.user.id,
          brandCountryId,
        },
      },
      create: {
        userId: ctx.auth.user.id,
        brandCountryId,
        buyRate,
        sellRate: existingUserRate.sellRate,
      },
      update: {
        buyRate,
      },
    });

    return { success: true as const };
  } catch (error) {
    if (error instanceof ActionError) throw error;
    console.error('Update buy rate error:', error);
    throw new ActionError('Failed to update buy rate');
  }
});
