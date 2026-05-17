'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { createOrderInputSchema, createOrderOutputSchema } from '@/types/domain/order';
import { getUserRates } from '@/lib/services/pricing';

export const createOrder = buyerActionClient
  .inputSchema(createOrderInputSchema)
  .outputSchema(createOrderOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const dbUser = await prisma.user.findUnique({ where: { id: ctx.auth.user.id } });
    const giftcards = await prisma.giftcard.findMany({ where: { id: { in: giftcardIds } } });

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
    } catch (error: any) {
      throw new ActionError(error.message || 'No se han configurado tarifas para esta marca y país.');
    }

    const total = ctx.giftcards.reduce((sum, card) => {
      return sum.plus(card.amount.mul(buyRate));
    }, new Prisma.Decimal(0));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: ctx.auth.user.id,
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
