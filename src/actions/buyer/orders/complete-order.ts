'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';

const completeOrderInputSchema = z.object({
  orderId: z.string(),
  _transactionId: z.string(),
});

export const completeOrder = buyerActionClient
  .inputSchema(completeOrderInputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { giftcards: true },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No estás autorizado para completar esta orden');
    if (order.status === 'COMPLETED') throw new ActionError('La orden ya ha sido completada');
    if (order.status !== 'AWAITING_PAYMENT') throw new ActionError('La orden debe ser confirmada antes de enviar el pago');
    return next({ ctx: { order } });
  })
  .action(async ({ parsedInput: { _transactionId }, ctx }) => {
    const { order } = ctx;
    const paymentAmount = order.adjustedTotal ?? order.total;
    await prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.platformSettings.upsert({
        where: { key: 'platformBalance' },
        update: { balance: { increment: paymentAmount } },
        create: { key: 'platformBalance', value: '', description: 'Balance General', balance: paymentAmount },
      });

      await tx.payment.create({
        data: {
          amount: paymentAmount,
          balanceAfter: updatedSettings.balance,
          direction: 'CREDIT',
          category: 'ORDER',
          orderId: order.id,
          binanceTxId: _transactionId,
          relatedUserId: order.userId,
        },
      });
      try {
        await tx.order.update({
          where: { id: order.id, status: 'AWAITING_PAYMENT' },
          data: { status: 'COMPLETED' },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new ActionError('La orden ya ha sido procesada por otra solicitud.');
        }
        throw err;
      }
    });
    return {
      success: true as const,
      orderId: order.id,
      message: 'Orden completada con éxito',
    };
  });
