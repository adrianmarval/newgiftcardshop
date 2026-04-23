'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { completeOrderInputSchema, completeOrderOutputSchema } from '@/types/domain/order';

export const completeOrder = buyerActionClient
  .inputSchema(completeOrderInputSchema)
  .outputSchema(completeOrderOutputSchema)
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
      await tx.payment.create({
        data: {
          amount: paymentAmount,
          balanceAfter: 0,
          status: 'COMPLETED',
          transactionType: 'DEBIT',
          orderId: order.id,
          transactionId: _transactionId,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });
      for (const card of order.giftcards) {
        if (card.status === 'UNUSED') {
          await tx.giftcard.update({
            where: { id: card.id },
            data: { status: 'USED', isConfirmed: true },
          });
        } else {
          await tx.giftcard.update({
            where: { id: card.id },
            data: { isConfirmed: true, status: card.status },
          });
        }
      }
    });
    return {
      success: true as const,
      orderId: order.id,
      message: 'Orden completada con éxito',
    };
  });
