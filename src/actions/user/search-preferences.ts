'use server';

import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const searchPreferencesSchema = z.object({
  minAmount: z.number().nullable(),
  maxAmount: z.number().nullable(),
});

export const updateSearchPreferences = authActionClient.inputSchema(searchPreferencesSchema).action(async function ({
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

export async function getUserSearchPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      minAmountPreference: true,
      maxAmountPreference: true,
      allowSearchPreferences: true,
      allowBuyRateAdjustment: true,
      buyRate: true,
    },
  });

  if (!user) return null;

  return {
    minAmount: user.minAmountPreference ? Number(user.minAmountPreference) : null,
    maxAmount: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
    allowSearchPreferences: user.allowSearchPreferences,
    allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    buyRate: Number(user.buyRate),
  };
}

const updateBuyRateSchema = z.object({
  buyRate: z.number().min(0.80, "La tarifa no puede ser inferior a 0.80 (80%)"),
});

export const updateBuyRate = authActionClient.inputSchema(updateBuyRateSchema).action(async function ({
  parsedInput: { buyRate },
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

    await prisma.user.update({
      where: { id: session.user.id },
      data: { buyRate },
    });

    return { success: true };
  } catch (error) {
    console.error('Update buy rate error:', error);
    return { error: 'Failed to update buy rate' };
  }
});
