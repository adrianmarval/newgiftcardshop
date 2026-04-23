'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { createOrderInputSchema, createOrderOutputSchema } from '@/types/domain/order';

export const createOrder = buyerActionClient
  .inputSchema(createOrderInputSchema)
  .outputSchema(createOrderOutputSchema)
  .useValidated(async ({ parsedInput: { giftcardIds }, ctx, next }) => {
    const [dbUser, giftcards] = await Promise.all([
      prisma.user.findUnique({ where: { id: ctx.auth.user.id } }),
      prisma.giftcard.findMany({ where: { id: { in: giftcardIds } } }),
    ]);

    if (!dbUser) throw new ActionError('Usuario no encontrado en la base de datos');

    return next({
      ctx: {
        dbUser,
        giftcards,
      },
    });
  })
  .action(async ({ parsedInput: { giftcardIds }, ctx }) => {
    const total = ctx.giftcards.reduce((sum, card) => {
      return sum.plus(card.amount.mul(ctx.dbUser.buyRate));
    }, new Prisma.Decimal(0));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: ctx.auth.user.id,
          total: total,
          buyRate: ctx.dbUser.buyRate,
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
