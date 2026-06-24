import { Decimal } from '@prisma/client/runtime/client';
import type { Giftcard } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { settingsService } from '@/lib/settings/settings.service';
import type { EscalationConfig } from '@/types';

export interface TierEstimationResult {
  minMinutes: number;
  nextCardTier: number;
  totalInaccessible: number;
  totalInaccessibleAmount: Decimal;
}

export interface AccessibleStockSummary {
  totalAmount: Decimal;
  cardCount: number;
}

export async function getEscalationConfig(): Promise<EscalationConfig> {
  return settingsService.getEscalationConfig();
}

export function estimateTimeToAccess(
  inaccessibleCards: Giftcard[],
  buyerBuyRate: number,
  config: EscalationConfig,
): TierEstimationResult | null {
  if (inaccessibleCards.length === 0) return null;

  if (!config.enabled) return null;

  const now = Date.now();
  const { durationMinutes, dropAmount } = config;

  let minMinutes = Infinity;
  let nextCardTier = 0;
  let totalInaccessibleAmount = new Decimal(0);

  for (const card of inaccessibleCards) {
    totalInaccessibleAmount = totalInaccessibleAmount.add(card.amount);

    const tierRestante = card.escalationTier - buyerBuyRate;
    if (tierRestante <= 0) continue;

    const ciclosRestantes = Math.ceil(tierRestante / dropAmount);
    const minutosTotal = ciclosRestantes * durationMinutes;
    const minutosTranscurridos = (now - card.tierStartedAt.getTime()) / 60000;
    const minutosRestantes = Math.max(0, minutosTotal - minutosTranscurridos);

    if (minutosRestantes < minMinutes) {
      minMinutes = minutosRestantes;
      nextCardTier = card.escalationTier;
    }
  }

  if (minMinutes === Infinity) return null;

  return {
    minMinutes: Math.ceil(minMinutes),
    nextCardTier,
    totalInaccessible: inaccessibleCards.length,
    totalInaccessibleAmount,
  };
}

export async function getAccessibleStockSummary(
  brandCountryId: string,
  buyerBuyRate: number,
): Promise<AccessibleStockSummary> {
  const cards = await prisma.giftcard.findMany({
    where: {
      brandCountryId,
      inStock: true,
      status: 'UNUSED',
      escalationTier: { lte: buyerBuyRate },
    },
    select: { amount: true },
  });

  let totalAmount = new Decimal(0);
  for (const card of cards) {
    totalAmount = totalAmount.add(card.amount);
  }

  return {
    totalAmount,
    cardCount: cards.length,
  };
}
