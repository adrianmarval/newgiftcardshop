'use server';

import { z } from 'zod';
import { findGiftcardCombination } from '@/lib/browse-giftcards';
import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';

const searchGiftcardsInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  amount: z.number(),
});

const searchGiftcardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z.array(
    z.object({
      id: z.string(),
      brand: z.string(),
      amount: z.number(),
      status: z.literal('UNUSED'),
      country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable().optional(),
      escalationTier: z.number().optional(),
    }),
  ),
  error: z.string().optional(),
  tierInfo: z
    .object({
      buyerBuyRate: z.number(),
      accessibleAmount: z.string(),
      inaccessibleAmount: z.string(),
      totalCards: z.number(),
      accessibleCardCount: z.number(),
      inaccessibleCardCount: z.number(),
    })
    .optional(),
});

async function getBuyerBuyRate(userId: string, brandCountryId: string): Promise<number> {
  const userRate = await prisma.userBrandCountryRate.findFirst({
    where: { userId, brandCountryId },
    select: { buyRate: true },
  });

  if (userRate && userRate.buyRate.gt(0)) {
    return Math.floor(userRate.buyRate.toNumber() * 100);
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

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardsInputSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }) => {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: true as const, giftcards: [], error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        creditLimit: true,
        role: true,
        minAmountPreference: true,
        maxAmountPreference: true,
      },
    });

    if (user?.role === 'BUYER') {
      const unpaidOrders = await prisma.order.findMany({
        where: {
          userId: session.user.id,
          status: { in: ['PENDING', 'AWAITING_PAYMENT'] },
        },
        select: { adjustedTotal: true, total: true, status: true },
      });

      let unpaidTotal = new Decimal(0);
      for (const o of unpaidOrders) {
        unpaidTotal = unpaidTotal.plus(o.adjustedTotal ?? o.total);
      }

      const creditLimit = user.creditLimit;

      if (unpaidTotal.gte(creditLimit)) {
        return {
          success: true as const,
          giftcards: [],
          error: 'Has alcanzado tu límite de crédito. Debes completar los pagos pendientes antes de comprar más.',
        };
      }

      const amountDecimal = new Decimal(amount);
      if (unpaidTotal.plus(amountDecimal).gt(creditLimit)) {
        const availableCredit = creditLimit.minus(unpaidTotal);
        const pendingText = unpaidTotal.gt(0) ? `Tienes $${unpaidTotal.toFixed(2)} en pagos pendientes. ` : '';
        return {
          success: true as const,
          giftcards: [],
          error: `Esta compra excedería tu límite de crédito. ${pendingText}Crédito disponible: $${availableCredit.toFixed(2)}. Intentá con un monto menor.`,
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

    const buyerBuyRate = await getBuyerBuyRate(session.user.id, brandCountry.id);

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

      if (totalInaccessible > 0 && totalAccessible === 0) {
        return {
          success: true as const,
          giftcards: [],
          error: `No hay tarjetas disponibles a tu tasa (${buyerBuyRate}%).\n\nReintentá en unos minutos.`,
        };
      }

      return {
        success: true as const,
        giftcards: [],
        error: `Podés acceder a ${result.tierInfo.accessibleCards.length} tarjetas ($${totalAccessible.toFixed(2)}).\n\nEl total disponible no alcanza las tarjetas que buscás. Intentá con un monto menor.`,
      };
    }

    return {
      success: true as const,
      giftcards: (result.selectedCards as (typeof allGiftcards)[number][]).map((card) => ({
        id: card.id,
        brand: card.brandCountryId,
        amount: Number(card.amount),
        status: 'UNUSED' as const,
        escalationTier: card.escalationTier ?? 100,
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
