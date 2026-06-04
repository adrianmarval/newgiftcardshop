import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';
import { settingsService } from '@/lib/settings/settings.service';

export interface EscalationConfig {
  enabled: boolean;
  durationMinutes: number;
  dropAmount: number;
}

export interface TierInfo {
  buyerBuyRate: number;
  accessibleAmount: string;
  totalAvailableAmount: string;
  tiers: { tier: number; amount: string }[];
}

export class GiftcardEscalationService {
  async getConfig(): Promise<EscalationConfig> {
    return settingsService.getEscalationConfig();
  }

  async getInitialTier(brandCountryId: string): Promise<number> {
    const maxUserRate = await prisma.userBrandCountryRate.findFirst({
      where: { brandCountryId },
      orderBy: { buyRate: 'desc' },
      select: { buyRate: true },
    });

    if (maxUserRate && maxUserRate.buyRate.gt(0)) {
      return Math.floor(maxUserRate.buyRate.toNumber() * 100);
    }

    const defaultRate = await prisma.brandCountryRate.findUnique({
      where: { brandCountryId },
      select: { buyRate: true },
    });

    if (defaultRate && defaultRate.buyRate.gt(0)) {
      return Math.floor(defaultRate.buyRate.toNumber() * 100);
    }

    return 100;
  }

  async getMinTierForBrandCountry(brandCountryId: string): Promise<number> {
    const minUserRate = await prisma.userBrandCountryRate.findFirst({
      where: { brandCountryId },
      orderBy: { buyRate: 'asc' },
      select: { buyRate: true },
    });

    if (minUserRate && minUserRate.buyRate.gt(0)) {
      return Math.floor(minUserRate.buyRate.toNumber() * 100);
    }

    const defaultRate = await prisma.brandCountryRate.findUnique({
      where: { brandCountryId },
      select: { buyRate: true },
    });

    if (defaultRate && defaultRate.buyRate.gt(0)) {
      return Math.floor(defaultRate.buyRate.toNumber() * 100);
    }

    return 70;
  }

  async processEscalationTiers(): Promise<{ processed: number }> {
    const config = await this.getConfig();
    if (!config.enabled) {
      return { processed: 0 };
    }

    const brandCountries = await prisma.brandCountry.findMany({
      select: { id: true },
    });

    const minTiersByBrandCountry = new Map<string, number>();
    for (const bc of brandCountries) {
      minTiersByBrandCountry.set(bc.id, await this.getMinTierForBrandCountry(bc.id));
    }

    const cutoffTime = new Date(Date.now() - config.durationMinutes * 60 * 1000);

    const cardsToEscalate = await prisma.giftcard.findMany({
      where: {
        inStock: true,
        status: 'UNUSED',
        tierStartedAt: { lte: cutoffTime },
      },
      select: { id: true, brandCountryId: true, escalationTier: true },
    });

    if (cardsToEscalate.length === 0) {
      return { processed: 0 };
    }

    const updates: { id: string; newTier: number }[] = [];

    for (const card of cardsToEscalate) {
      const minTier = minTiersByBrandCountry.get(card.brandCountryId) ?? 70;
      if (card.escalationTier > minTier) {
        const newTier = card.escalationTier - config.dropAmount;
        updates.push({ id: card.id, newTier: Math.max(newTier, minTier) });
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.giftcard.update({
            where: { id: u.id },
            data: {
              escalationTier: u.newTier,
              tierStartedAt: new Date(),
            },
          })
        )
      );
    }

    return { processed: updates.length };
  }

  async getTierInfoForBuyer(buyerId: string, brandCountryId: string): Promise<TierInfo | null> {
    const userRate = await prisma.userBrandCountryRate.findFirst({
      where: { userId: buyerId, brandCountryId },
      select: { buyRate: true },
    });

    let buyerBuyRate: number;
    if (userRate) {
      buyerBuyRate = Math.floor(userRate.buyRate.toNumber());
    } else {
      const defaultRate = await prisma.brandCountryRate.findUnique({
        where: { brandCountryId },
        select: { buyRate: true },
      });
      buyerBuyRate = defaultRate ? Math.floor(defaultRate.buyRate.toNumber()) : 100;
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

  canBuyerAccessTier(buyerBuyRate: number, cardTier: number): boolean {
    return cardTier <= buyerBuyRate;
  }
}

export const giftcardEscalationService = new GiftcardEscalationService();