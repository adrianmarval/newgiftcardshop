'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getUserRates } from '@/services/pricing.service';

const createOrderInputSchema = z.object({ giftcardIds: z.array(z.string()) });

function validateTierAccess(cards: { id: string; escalationTier: number | null | undefined }[], buyerBuyRate: number): string | null {
  const blockedCards: string[] = [];

  for (const card of cards) {
    const tier = card.escalationTier != null ? Number(card.escalationTier) : 100;
    if (tier > buyerBuyRate) {
      blockedCards.push(card.id);
    }
  }

  if (blockedCards.length > 0) {
    return `No puedes tomar ${blockedCards.length} tarjeta(s). Algunas cambiaron de tier. Por favor re-busca.`;
  }

  return null;
}

export const createOrder = buyerActionClient
  .inputSchema(createOrderInputSchema)
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const dbUser = await prisma.user.findUnique({ where: { id: ctx.auth.user.id } });
    const giftcards = await prisma.giftcard.findMany({
      where: { id: { in: giftcardIds } },
      select: { id: true, amount: true, brandCountryId: true, escalationTier: true },
    });

    if (!dbUser) throw new ActionError('Usuario no encontrado en la base de datos');
    if (giftcards.length === 0) throw new ActionError('No se especificaron tarjetas de regalo válidas');

    return next({
      ctx: {
        dbUser,
        giftcards,
      },
    });
  })
  .action(async ({ parsedInput: { giftcardIds }, ctx }) => {
    const firstCard = ctx.giftcards[0];
    let buyRate: Prisma.Decimal;

    try {
      const rates = await getUserRates(ctx.auth.user.id, { brandCountryId: firstCard.brandCountryId });
      buyRate = rates.buyRate as Prisma.Decimal;
    } catch (error) {
      console.error(error);
      throw new ActionError('No se han configurado tarifas para esta marca y país.');
    }

    const buyerBuyRate = Math.floor(buyRate.toNumber() * 100);

    const tierError = validateTierAccess(ctx.giftcards, buyerBuyRate);
    if (tierError) {
      throw new ActionError(tierError);
    }

    const total = ctx.giftcards.reduce((sum, card) => {
      return sum.plus(card.amount.mul(buyRate));
    }, new Prisma.Decimal(0));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: ctx.auth.user.id,
          brandCountryId: firstCard.brandCountryId,
          total: total,
          buyRate: buyRate,
          status: 'PENDING',
          giftcards: {
            connect: giftcardIds.map((id) => ({ id })),
          },
        },
      });

      await tx.giftcard.updateMany({
        where: { id: { in: giftcardIds } },
        data: { inStock: false },
      });

      return createdOrder;
    });

    return { success: true as const, orderId: order.id };
  });
