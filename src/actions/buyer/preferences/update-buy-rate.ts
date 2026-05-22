'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { headers } from 'next/headers';
import z from 'zod';

const updateBuyRateInputSchema = z.object({
  brandCountryId: z.string().min(1, 'Debe seleccionar una marca y país'),
  buyRate: z.number().min(0.8, 'La tarifa no puede ser inferior a 0.80 (80%)').max(1.0, 'La tarifa no puede ser superior a 1.00 (100%)'),
});

export const updateBuyRate = authActionClient.inputSchema(updateBuyRateInputSchema).action(async function ({
  parsedInput: { brandCountryId, buyRate },
}) {
  try {
    const headersList = await headers();
    const session = await import('@/lib/auth').then((m) => m.auth.api.getSession({ headers: headersList }));

    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { allowBuyRateAdjustment: true },
    });

    if (!user?.allowBuyRateAdjustment) {
      return { error: 'No tienes permiso para ajustar tu tarifa' };
    }

    // Obtener la tarifa global de fallback para saber la sellRate por defecto
    const globalRate = await prisma.brandCountryRate.findUnique({
      where: { brandCountryId },
    });

    const sellRate = globalRate?.sellRate ?? 0.75;

    // Guardar en UserBrandCountryRate
    await prisma.userBrandCountryRate.upsert({
      where: {
        userId_brandCountryId: {
          userId: session.user.id,
          brandCountryId,
        },
      },
      create: {
        userId: session.user.id,
        brandCountryId,
        buyRate,
        sellRate,
      },
      update: {
        buyRate,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Update buy rate error:', error);
    return { error: 'Failed to update buy rate' };
  }
});
