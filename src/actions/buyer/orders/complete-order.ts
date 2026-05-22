'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getPlatformBalance, updatePlatformBalance } from '@/actions/platform/settings';

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
      const platformBalance = await getPlatformBalance();

      const balanceAfter = platformBalance.data?.balance
        ? platformBalance.data.balance.add(new Prisma.Decimal(paymentAmount))
        : new Prisma.Decimal(paymentAmount);

      await tx.payment.create({
        data: {
          amount: paymentAmount,
          balanceAfter: balanceAfter,
          direction: 'CREDIT',
          category: 'ORDER',
          orderId: order.id,
          binanceTxId: _transactionId,
          relatedUserId: order.userId,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });
      // actualizar balance de la plataforma
      const res = await updatePlatformBalance({ amount: paymentAmount, type: 'add' });
      if (!res.data?.success) {
        throw new Error('Error al actualizar el balance de la plataforma');
      }
    });
    return {
      success: true as const,
      orderId: order.id,
      message: 'Orden completada con éxito',
    };
  });
