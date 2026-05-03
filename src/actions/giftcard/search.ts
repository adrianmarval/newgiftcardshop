'use server';

import { findGiftcardCombination } from '@/lib/browse-giftcards';
import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { headers } from 'next/headers';
import { searchGiftcardSchema, searchGiftcardsOutputSchema } from '@/types/application/buy-flow';
import { auth } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/client';

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
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
          status: 'AWAITING_PAYMENT',
        },
        select: { adjustedTotal: true, total: true },
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
          error: 'Has alcanzado tu límite de crédito. Debes realizar el pago antes de continuar.',
        };
      }

      const amountDecimal = new Decimal(amount);
      if (unpaidTotal.plus(amountDecimal).gt(creditLimit)) {
        const pendingText = unpaidTotal.gt(0) ? ` Ya tienes $${unpaidTotal.toFixed(2)} pendiente.` : '';
        return {
          success: true as const,
          giftcards: [],
          error: `Esta compra excedería tu límite de crédito ($${creditLimit.toNumber()}).${pendingText}`,
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

    const selectedGiftcards = findGiftcardCombination(
      allGiftcards,
      amount,
      user?.minAmountPreference ? new Decimal(user.minAmountPreference) : undefined,
      user?.maxAmountPreference ? new Decimal(user.maxAmountPreference) : undefined,
    );

    if (selectedGiftcards.selectedCards.length === 0 && allGiftcards.length > 0) {
      const outsideAmount = allGiftcards.reduce((sum, c) => sum + Number(c.amount), 0);
      return {
        success: true as const,
        giftcards: [],
        error: `No hay tarjetas dentro de tus preferencias. Hay $${outsideAmount.toFixed(2)} disponible. Cambiá tus preferencias para ver más opciones.`,
      };
    }

    return {
      success: true as const,
      giftcards: (selectedGiftcards.selectedCards as any[]).map((card) => ({
        id: card.id,
        brand: card.brandCountryId,
        amount: Number(card.amount),
        status: 'UNUSED' as const,
        country: card.brandCountry.country
          ? {
              name: card.brandCountry.country.name,
              code: card.brandCountry.country.code,
              currency: card.brandCountry.country.currency,
            }
          : null,
      })),
    };
  });
