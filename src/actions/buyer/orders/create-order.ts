'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getUserRates } from '@/lib/services/pricing';
import { reserveGiftcards, GiftcardReservationError } from '@/lib/services/giftcard/reservation';
import { checkCreditLimit } from '@/lib/services/payment/credit';
import { logger } from '@/lib/logger';
import { createOrderInputSchema, createOrderOutputSchema } from './schemas';

function validateTierAccess(
  cards: { id: string; escalationTier: number | null | undefined }[],
  buyerBuyRate: number,
): string | null {
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
  .outputSchema(createOrderOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: { id: true, creditLimit: true },
    });
    const giftcards = await prisma.giftcard.findMany({
      where: { id: { in: giftcardIds }, inStock: true, status: 'UNUSED', orderId: null },
      select: { id: true, amount: true, brandCountryId: true, escalationTier: true },
    });

    if (!dbUser) throw new ActionError('Usuario no encontrado en la base de datos');
    if (giftcards.length === 0)
      throw new ActionError('Una o mas tarjetas de la orden ya no estan disponibles. Por favor regresa y busca tarjetas nuevamente');

    return next({
      ctx: {
        dbUser,
        giftcards,
      },
    });
  })
  .action(async ({ parsedInput: { giftcardIds, idempotencyKey }, ctx }) => {
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        logger.debug('Orden existente por idempotency key', {
          userId: ctx.auth.user.id,
          metadata: { orderId: existing.id, idempotencyKey },
        });
        return { success: true as const, orderId: existing.id };
      }
    }

    const firstCard = ctx.giftcards[0];
    let buyRate: Prisma.Decimal;

    try {
      const rates = await getUserRates(ctx.auth.user.id, { brandCountryId: firstCard.brandCountryId });
      buyRate = rates.buyRate as Prisma.Decimal;
    } catch (error) {
      console.error(error);
      throw new ActionError('You do not have a rate assigned for this brand and country. Contact the administrator.');
    }

    const buyerBuyRate = Math.floor(buyRate.toNumber() * 100);

    const tierError = validateTierAccess(ctx.giftcards, buyerBuyRate);
    if (tierError) {
      throw new ActionError(tierError);
    }

    const total = ctx.giftcards.reduce((sum, card) => {
      return sum.plus(card.amount.mul(buyRate));
    }, new Prisma.Decimal(0));

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const creditCheck = await checkCreditLimit(ctx.auth.user.id, total, tx);
        if (!creditCheck.allowed) {
          throw new ActionError('Límite de crédito insuficiente. Tenés pagos pendientes que bloquean esta compra.');
        }

        const createdOrder = await tx.order.create({
          data: {
            userId: ctx.auth.user.id,
            brandCountryId: firstCard.brandCountryId,
            total: total,
            buyRate: buyRate,
            status: 'PENDING',
            idempotencyKey,
          },
        });

        await reserveGiftcards(tx, giftcardIds, createdOrder.id);

        return createdOrder;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof GiftcardReservationError) {
        logger.warn('Error de reserva en creación de orden', {
          userId: ctx.auth.user.id,
          metadata: { giftcardIds, error: error.message },
        });
        throw new ActionError(error.message);
      }
      logger.error('Error inesperado al crear orden', {
        userId: ctx.auth.user.id,
        metadata: { giftcardIds },
        error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : 'Unknown' },
      });
      throw error;
    }

    logger.action('buy', 'create-order', `Orden ${order.id} creada con ${giftcardIds.length} tarjetas`, {
      userId: ctx.auth.user.id,
      metadata: {
        orderId: order.id,
        giftcardCount: giftcardIds.length,
        total: order.total.toString(),
        buyRate: order.buyRate.toString(),
      },
    });

    return { success: true as const, orderId: order.id };
  });