'use server';

import { findGiftcardCombination } from '@/lib/services/browse/card-combinator';
import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { Decimal } from '@prisma/client/runtime/client';
import { estimateTimeToAccess } from '@/lib/services/pricing/tier-estimation';
import { getEscalationConfig } from '@/lib/settings/settings.service';
import { getBuyerBuyRate } from '@/lib/services/pricing';
import { checkCreditLimit } from '@/lib/services/payment/credit';
import { searchGiftcardsInputSchema, searchGiftcardsOutputSchema } from './schemas';
import { formatCurrency } from '@/lib/utils';

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardsInputSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount }, ctx }) => {
    const userId = ctx.auth.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        minAmountPreference: true,
        maxAmountPreference: true,
      },
    });

    if (user?.role === 'BUYER') {
      const amountDecimal = new Decimal(amount);
      const credit = await checkCreditLimit(userId, amountDecimal);

      if (!credit.allowed) {
        const pendingText = credit.unpaidTotal.gt(0) ? `Tienes ${formatCurrency(credit.unpaidTotal.toNumber())} en pagos pendientes. ` : '';
        return {
          success: true as const,
          giftcards: [],
          error: credit.availableCredit.lte(0)
            ? 'Has alcanzado tu límite de crédito. Debes completar los pagos pendientes antes de comprar más.'
            : `Esta compra excedería tu límite de crédito. ${pendingText}Crédito disponible: ${formatCurrency(credit.availableCredit.toNumber())}. Intentá con un monto menor.`,
        };
      }
    }

    const brandCountry = await prisma.brandCountry.findUnique({
      where: { brandId_countryId: { brandId, countryId } },
      select: { id: true },
    });
    if (!brandCountry) {
      return { success: true as const, giftcards: [] };
    }

    let buyerBuyRate: number;
    try {
      buyerBuyRate = await getBuyerBuyRate(userId, brandCountry.id);
    } catch (err: any) {
      return {
        success: true as const,
        giftcards: [],
        error: err.message || 'No tienes tarifa asignada para esta marca y país.',
      };
    }

    const allGiftcards = await prisma.giftcard.findMany({
      where: {
        brandCountryId: brandCountry.id,
        inStock: true,
        status: 'UNUSED',
      },
      include: {
        brandCountry: {
          include: {
            country: true,
          },
        },
      },
    });

    const result = findGiftcardCombination(
      allGiftcards,
      amount,
      buyerBuyRate,
      user?.minAmountPreference ? new Decimal(user.minAmountPreference) : undefined,
      user?.maxAmountPreference ? new Decimal(user.maxAmountPreference) : undefined,
    );

    if (result.selectedCards.length === 0 && allGiftcards.length > 0) {
      const totalInaccessible = result.tierInfo.inaccessibleAmount.toNumber();
      const totalAccessible = result.tierInfo.accessibleAmount.toNumber();
      const accessibleCards = result.tierInfo.accessibleCards;

      if (totalInaccessible > 0 && totalAccessible === 0) {
        const escalationConfig = await getEscalationConfig();
        const estimation = estimateTimeToAccess(
          result.tierInfo.inaccessibleCards as (typeof allGiftcards)[number][],
          buyerBuyRate,
          escalationConfig,
        );

        const estimationPart = estimation
          ? ` La próxima estará disponible en ~${estimation.minMinutes} min (tier ${estimation.nextCardTier}% → ${buyerBuyRate}%).`
          : '';

        return {
          success: true as const,
          giftcards: [],
          error: `No hay tarjetas disponibles para tu tasa del ${buyerBuyRate}%. Hay ${formatCurrency(totalInaccessible)} en ${result.tierInfo.inaccessibleCards.length} tarjetas con tier superior.${estimationPart}`,
          tierInfo: {
            buyerBuyRate,
            accessibleAmount: result.tierInfo.accessibleAmount.toString(),
            inaccessibleAmount: result.tierInfo.inaccessibleAmount.toString(),
            totalCards: allGiftcards.length,
            accessibleCardCount: result.tierInfo.accessibleCards.length,
            inaccessibleCardCount: result.tierInfo.inaccessibleCards.length,
            ...(estimation ? { nextCardTier: estimation.nextCardTier, estimatedMinutes: estimation.minMinutes } : {}),
          },
        };
      }

      if (accessibleCards.length > 0) {
        const minCard = accessibleCards.reduce((min, c) => (c.amount.lt(min.amount) ? c : min), accessibleCards[0]);
        if (minCard.amount.gt(amount)) {
          return {
            success: true as const,
            giftcards: [],
            error: `La tarjeta más chica disponible es de ${formatCurrency(minCard.amount.toNumber())}. Intentá con un monto mayor o igual.`,
          };
        }
      }

      return {
        success: true as const,
        giftcards: [],
        error: `No se encontró una combinación exacta para ${formatCurrency(amount)}. Probá con otro monto.`,
      };
    }

    return {
      success: true as const,
      giftcards: (result.selectedCards as (typeof allGiftcards)[number][]).map((card) => ({
        id: card.id,
        brand: card.brandCountryId,
        amount: Number(card.amount),
        status: 'UNUSED' as const,
        escalationTier: card.escalationTier,
        country: card.brandCountry?.country
          ? {
              name: card.brandCountry.country.name,
              code: card.brandCountry.country.code,
              currency: card.brandCountry.country.currency,
            }
          : null,
      })),
      tierInfo: {
        buyerBuyRate,
        accessibleAmount: result.tierInfo.accessibleAmount.toString(),
        inaccessibleAmount: result.tierInfo.inaccessibleAmount.toString(),
        totalCards: allGiftcards.length,
        accessibleCardCount: result.tierInfo.accessibleCards.length,
        inaccessibleCardCount: result.tierInfo.inaccessibleCards.length,
      },
    };
  });