// ─────────────────────────────────────────────────────────────────────────────
// Search Preferences Service — preferencias de búsqueda del buyer (wizard step 1).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';

export async function getSearchPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      minAmountPreference: true,
      maxAmountPreference: true,
      allowSearchPreferences: true,
      allowBuyRateAdjustment: true,
    },
  });

  if (!user) {
    return {
      minAmount: null,
      maxAmount: null,
      allowSearchPreferences: false,
      allowBuyRateAdjustment: false,
      buyRate: null,
    };
  }

  return {
    minAmount: user.minAmountPreference ? Number(user.minAmountPreference) : null,
    maxAmount: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
    allowSearchPreferences: user.allowSearchPreferences,
    allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    buyRate: null,
  };
}
