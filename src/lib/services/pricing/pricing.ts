import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { GiftcardStatus as GiftcardStatusEnum } from '@/generated/prisma/enums';
import type { GiftcardLike } from '@/types';
import { logger } from '@/lib/logger';

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

function sumFaceValue(giftcards: GiftcardLike[]): Prisma.Decimal {
  return giftcards.reduce((sum, card) => {
    if (card.status === GiftcardStatusEnum.UNUSED || card.status === GiftcardStatusEnum.USED) {
      return sum.plus(card.amount);
    }
    if (card.status === GiftcardStatusEnum.WRONG_AMOUNT) {
      return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    }
    return sum;
  }, new Prisma.Decimal(0));
}

/**
 * Computes the face value total from a list of giftcards (no rate applied).
 * - UNUSED/USED cards contribute their nominal amount
 * - WRONG_AMOUNT cards contribute their reportedAmount (if available)
 * - Other statuses (ALREADY_USED, INVALID, DEACTIVATED) contribute 0
 */
export function computeFaceValueTotal(giftcards: GiftcardLike[]): Prisma.Decimal {
  return sumFaceValue(giftcards);
}

/**
 * Computes face value and effective totals from a list of giftcards.
 * Returns both the face value total and effective total (faceValue * rate).
 */
export function computeOrderGiftcardTotals(giftcards: GiftcardLike[], rate: Prisma.Decimal) {
  const faceValueTotal = sumFaceValue(giftcards);
  return {
    faceValueTotal: faceValueTotal.toNumber(),
    effectiveTotal: faceValueTotal.mul(rate).toNumber(),
  };
}

/**
 * Computes the effective total (face value * rate) from a list of giftcards.
 * Returns effectiveTotal as Decimal (for database operations).
 */
export function computeEffectiveTotalDecimal(giftcards: GiftcardLike[], rate: Prisma.Decimal): Prisma.Decimal {
  return sumFaceValue(giftcards).mul(rate);
}

export async function getUserRates(userId: string, params: { brandCountryId?: string; brandId?: string; countryId?: string }) {
  let brandCountryId = params.brandCountryId;
  let brandId = params.brandId;
  let countryId = params.countryId;

  // Si brandId viene en formato compuesto (ej. "brandId|countryId"), lo separamos de forma robusta
  if (brandId && brandId.includes('|')) {
    const parts = brandId.split('|');
    brandId = parts[0];
    if (!countryId) {
      countryId = parts[1];
    }
  }

  if (!brandCountryId && brandId && countryId) {
    const bc = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: {
          brandId,
          countryId,
        },
      },
      select: { id: true },
    });
    brandCountryId = bc?.id;
  }

  if (!brandCountryId && brandId && !countryId) {
    const bc = await prisma.brandCountry.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    brandCountryId = bc?.id;
  }

  if (!brandCountryId) {
    logger.warn('PricingError: Combinación de marca y país no válida', {
      flow: 'pricing',
      action: 'get-user-rates',
      userId,
      metadata: { brandId, countryId, brandCountryId },
    });
    throw new PricingError('Combinación de marca y país no válida.');
  }

  // 1. Buscar tasa personalizada del usuario
  const userRate = await prisma.userBrandCountryRate.findUnique({
    where: {
      userId_brandCountryId: {
        userId,
        brandCountryId,
      },
    },
  });

  if (userRate) {
    return {
      buyRate: userRate.buyRate,
      sellRate: userRate.sellRate,
      isCustom: true,
    };
  }

  logger.warn('PricingError: Sin tasa asignada', {
    flow: 'pricing',
    action: 'get-user-rates',
    userId,
    metadata: { brandCountryId },
  });
  throw new PricingError('No tienes una tasa asignada para esta marca y país. Contacta al administrador.');
}

/**
 * Gets the buyer's buy rate for a specific brand-country.
 * Returns the rate as a percentage (e.g., 95 for 0.95).
 * Throws ActionError if no rate is assigned.
 */
export async function getBuyerBuyRate(userId: string, brandCountryId: string): Promise<number> {
  const userRate = await prisma.userBrandCountryRate.findFirst({
    where: { userId, brandCountryId },
    select: { buyRate: true },
  });

  if (userRate && userRate.buyRate.gt(0)) {
    // floor sobre el Decimal — toNumber() primero introduce float artifacts
    // (Math.floor(0.57 * 100) === 56) y el buyer pierde un tier.
    return userRate.buyRate.times(100).floor().toNumber();
  }

  logger.warn('PricingError: Sin tarifa asignada (buyer)', {
    flow: 'buy',
    action: 'get-buyer-buy-rate',
    userId,
    metadata: { brandCountryId },
  });
  throw new PricingError('No tienes tarifa asignada para esta marca y país.');
}
