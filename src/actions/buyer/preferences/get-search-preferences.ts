'use server';

import prisma from '@/lib/prisma';

export async function getUserSearchPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      minAmountPreference: true,
      maxAmountPreference: true,
      allowSearchPreferences: true,
      allowBuyRateAdjustment: true,
    },
  });

  if (!user) return null;

  return {
    minAmount: user.minAmountPreference ? Number(user.minAmountPreference) : null,
    maxAmount: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
    allowSearchPreferences: user.allowSearchPreferences,
    allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    buyRate: null,
  };
}
