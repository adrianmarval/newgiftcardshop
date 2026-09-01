'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getUserRates } from '@/lib/services/pricing';
import { reserveGiftcards, GiftcardReservationError } from '@/lib/services/giftcard/reservation';
import { checkCreditLimit } from '@/lib/services/payment/credit';
import { publishToRole, publishToUser } from '@/lib/realtime/bus';
import { withSerializableRetry } from '@/lib/utils/prisma-retry';
import { logger } from '@/lib/logger';
import { createOrderInputSchema, createOrderOutputSchema } from './schemas';

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

    // Todas las cards deben compartir UN brand-country: la tasa, el tier floor y
    // el brandCountryId de la orden se derivan del primero — cards mezcladas de
    // otro brand-country se pricearían con una tasa que el admin nunca asignó ahí.
    const brandCountryIds = new Set(giftcards.map((card) => card.brandCountryId));
    if (brandCountryIds.size > 1)
      throw new ActionError('Las tarjetas de una orden deben pertenecer a la misma marca y país. Por favor regresa y busca nuevamente');

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

    // floor(buyRate * 100) sobre el Decimal — NUNCA toNumber() primero:
    // Math.floor(0.57 * 100) === 56 por float artifact y el buyer perdería un tier.
    const buyerBuyRate = buyRate.times(100).floor().toNumber();

    const tierError = validateTierAccess(ctx.giftcards, buyerBuyRate);
    if (tierError) {
      throw new ActionError(tierError);
    }

    const faceValueTotal = ctx.giftcards.reduce((sum, card) => {
      return sum.plus(card.amount);
    }, new Prisma.Decimal(0));

    const total = faceValueTotal.mul(buyRate);

    let order;
    try {
      order = await withSerializableRetry(() =>
        prisma.$transaction(
          async (tx) => {
            const creditCheck = await checkCreditLimit(ctx.auth.user.id, faceValueTotal, tx);
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
          },
          { isolationLevel: 'Serializable' },
        ),
      );
    } catch (error) {
      if (error instanceof GiftcardReservationError) {
        logger.warn('Error de reserva en creación de orden', {
          userId: ctx.auth.user.id,
          metadata: { giftcardIds, error: error.message },
        });
        throw new ActionError(error.message);
      }
      // Doble-submit concurrente con el mismo idempotencyKey: el pre-check de
      // arriba es TOCTOU — ambos requests entran a la tx y el perdedor choca con
      // el @unique. La orden del buyer YA existe: devolverla en vez de un 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && idempotencyKey) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });
        if (existing) {
          logger.info('Orden recuperada tras P2002 en idempotency key (doble submit concurrente)', {
            userId: ctx.auth.user.id,
            metadata: { orderId: existing.id, idempotencyKey },
          });
          return { success: true as const, orderId: existing.id };
        }
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

    // Invalidación realtime: stock reservado baja para TODOS los buyers,
    // la orden aparece en el listado del buyer y en el panel admin
    publishToUser(ctx.auth.user.id, ['orders', 'stats']);
    publishToRole('BUYER', ['availability']);
    publishToRole('ADMIN', ['orders']);

    return { success: true as const, orderId: order.id };
  });
