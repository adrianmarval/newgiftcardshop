import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';
import { getEscalationConfig } from '@/lib/settings/settings.service';
import { notifyBuyersTierDrop } from '@/lib/notifications';
import { publishToRole } from '@/lib/realtime/bus';
import { logger } from '@/lib/logger';
import type { EscalationConfig, TierInfo, TierDropEvent } from '@/types';

export async function getConfig(): Promise<EscalationConfig> {
  return getEscalationConfig();
}

export async function getInitialTier(brandCountryId: string): Promise<number | null> {
  const maxUserRate = await prisma.userBrandCountryRate.findFirst({
    where: { brandCountryId, user: { role: 'BUYER' } },
    orderBy: { buyRate: 'desc' },
    select: { buyRate: true },
  });

  if (maxUserRate && maxUserRate.buyRate.gt(0)) {
    // floor sobre el Decimal (toNumber() primero = float artifact, ver pricing.ts)
    return maxUserRate.buyRate.times(100).floor().toNumber();
  }

  return null;
}

async function getMinTierForBrandCountry(brandCountryId: string): Promise<number> {
  const minUserRate = await prisma.userBrandCountryRate.findFirst({
    where: { brandCountryId, user: { role: 'BUYER' } },
    orderBy: { buyRate: 'asc' },
    select: { buyRate: true },
  });

  if (minUserRate && minUserRate.buyRate.gt(0)) {
    // floor sobre el Decimal (toNumber() primero = float artifact, ver pricing.ts)
    return minUserRate.buyRate.times(100).floor().toNumber();
  }

  return 80;
}

export async function processEscalationTiers(): Promise<{ processed: number }> {
  const config = await getConfig();
  if (!config.enabled) {
    return { processed: 0 };
  }

  const brandCountries = await prisma.brandCountry.findMany({
    select: { id: true },
  });

  const minTiersByBrandCountry = new Map<string, number>();
  for (const bc of brandCountries) {
    minTiersByBrandCountry.set(bc.id, await getMinTierForBrandCountry(bc.id));
  }

  const cutoffTime = new Date(Date.now() - config.durationMinutes * 60 * 1000);

  const cardsToEscalate = await prisma.giftcard.findMany({
    where: {
      inStock: true,
      status: 'UNUSED',
      tierStartedAt: { lte: cutoffTime },
    },
    select: { id: true, brandCountryId: true, escalationTier: true, tierStartedAt: true },
  });

  if (cardsToEscalate.length === 0) {
    return { processed: 0 };
  }

  const cycleMs = config.durationMinutes * 60 * 1000;
  const updates: { id: string; newTier: number; newTierStartedAt: Date }[] = [];

  for (const card of cardsToEscalate) {
    const minTier = minTiersByBrandCountry.get(card.brandCountryId) ?? 80;
    if (card.escalationTier > minTier) {
      const newTier = card.escalationTier - config.dropAmount;
      // Schedule ANCLADO: el nuevo tier arranca en el VENCIMIENTO del ciclo
      // (tierStartedAt + 1 ciclo), no en el tiempo del tick. Resetear a now()
      // acumulaba el atraso del tick (hasta 60s) en CADA ciclo — con
      // duration=1min la espera real llegaba a ~2x la estimada. Anclado, un
      // cron atrasado se pone al día solo: si la card va N ciclos vencida,
      // sigue elegible y el próximo tick la vuelve a dropear.
      updates.push({ id: card.id, newTier: Math.max(newTier, minTier), newTierStartedAt: new Date(card.tierStartedAt.getTime() + cycleMs) });
    } else if (card.escalationTier === minTier) {
      const timeInMinTier = Date.now() - card.tierStartedAt.getTime();
      const minTierTimeout = cycleMs * 3;
      if (timeInMinTier >= minTierTimeout) {
        const newTier = card.escalationTier - config.dropAmount;
        // Anclado al vencimiento del timeout (3 ciclos) — el próximo drop
        // vence un ciclo después, no 3 (el grace period ya se cumplió).
        updates.push({ id: card.id, newTier: Math.max(newTier, 0), newTierStartedAt: new Date(card.tierStartedAt.getTime() + minTierTimeout) });
      }
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.giftcard.update({
          where: { id: u.id },
          data: {
            escalationTier: u.newTier,
            tierStartedAt: u.newTierStartedAt,
          },
        }),
      ),
    );

    const tierDropEvents: TierDropEvent[] = cardsToEscalate
      .filter((card) => {
        const update = updates.find((u) => u.id === card.id);
        return update !== undefined && update.newTier < card.escalationTier;
      })
      .map((card) => {
        const update = updates.find((u) => u.id === card.id)!;
        return {
          giftcardId: card.id,
          brandCountryId: card.brandCountryId,
          oldTier: card.escalationTier,
          newTier: update.newTier,
        };
      });

    if (tierDropEvents.length > 0) {
      notifyBuyersTierDrop(tierDropEvents).catch((err) =>
        logger.error('Error al notificar tier drops (non-blocking)', {
          flow: 'batch',
          action: 'escalation-cron',
          metadata: { eventCount: tierDropEvents.length },
          error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown' },
        }),
      );

      // Tier drops = más stock accesible → los grids de buyers se actualizan
      // en cuanto el cron corre (la frecuencia de detección sigue siendo la del cron)
      publishToRole('BUYER', ['availability']);
    }
  }

  return { processed: updates.length };
}

export async function getTierInfoForBuyer(buyerId: string, brandCountryId: string): Promise<TierInfo | null> {
  const userRate = await prisma.userBrandCountryRate.findFirst({
    where: { userId: buyerId, brandCountryId },
    select: { buyRate: true },
  });

  let buyerBuyRate: number;
  if (userRate) {
    // floor sobre el Decimal (toNumber() primero = float artifact, ver pricing.ts)
    buyerBuyRate = userRate.buyRate.times(100).floor().toNumber();
  } else {
    buyerBuyRate = 100;
  }

  const availableCards = await prisma.giftcard.findMany({
    where: {
      brandCountryId,
      inStock: true,
      status: 'UNUSED',
    },
    select: { amount: true, escalationTier: true },
  });

  const tiersMap = new Map<number, Decimal>();
  let accessibleAmount = new Decimal(0);
  let totalAvailableAmount = new Decimal(0);

  for (const card of availableCards) {
    totalAvailableAmount = totalAvailableAmount.add(card.amount);

    const currentTierAmount = tiersMap.get(card.escalationTier) || new Decimal(0);
    tiersMap.set(card.escalationTier, currentTierAmount.add(card.amount));

    if (card.escalationTier <= buyerBuyRate) {
      accessibleAmount = accessibleAmount.add(card.amount);
    }
  }

  const tiers = Array.from(tiersMap.entries())
    .map(([tier, amount]) => ({ tier, amount: amount.toString() }))
    .sort((a, b) => a.tier - b.tier);

  return {
    buyerBuyRate,
    accessibleAmount: accessibleAmount.toString(),
    totalAvailableAmount: totalAvailableAmount.toString(),
    tiers,
  };
}

export function canBuyerAccessTier(buyerBuyRate: number, cardTier: number): boolean {
  return cardTier <= buyerBuyRate;
}
