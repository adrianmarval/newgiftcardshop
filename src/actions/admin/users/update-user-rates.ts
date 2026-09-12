'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { logger } from '@/lib/logger';
import { updateUserRatesInputSchema, updateUserRatesOutputSchema } from './schemas';

export const updateUserRates = adminActionClient
  .inputSchema(updateUserRatesInputSchema)
  .outputSchema(updateUserRatesOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, brandCountryId, buyRate, sellRate } = parsedInput;

    await prisma.userBrandCountryRate.upsert({
      where: {
        userId_brandCountryId: {
          userId,
          brandCountryId,
        },
      },
      create: {
        userId,
        brandCountryId,
        buyRate,
        sellRate,
      },
      update: {
        buyRate,
        sellRate,
      },
    });

    // Audit trail — las tarifas deciden quién puede comprar/vender y a qué
    // precio; SIEMPRE logueadas (incidente sept 2026).
    logger.action('admin', 'update-user-rates', `Tarifas actualizadas para usuario ${userId}`, {
      userId: ctx.auth.user.id,
      metadata: { targetUserId: userId, brandCountryId, buyRate, sellRate },
    });

    return { success: true as const };
  });