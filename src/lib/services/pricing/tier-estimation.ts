import { Decimal } from '@prisma/client/runtime/client';
import type { Giftcard } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import type { AccessibleStockSummary, EscalationConfig, TierEstimationResult } from '@/types';

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
    // Mínimo 1: ceil(0) mostraba "~0 min" durante toda la ventana entre el
    // vencimiento de la card y el próximo tick del cron (hasta 60s) — el
    // buyer veía "0 min" y la tarjeta no aparecía. Con el schedule anclado
    // (escalation.ts) la estimación es exacta ±1 tick.
    minMinutes: Math.max(1, Math.ceil(minMinutes)),
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
