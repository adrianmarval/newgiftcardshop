import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { computeEffectiveTotalDecimal } from '@/lib/services/pricing';
import { OrderNotFoundError, InvalidOrderStateError, OrderAlreadyProcessedError } from './order-errors';
import { logger } from '@/lib/logger';

/**
 * Cancels an order and marks all giftcards as confirmed.
 */
export async function cancelOrder(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      giftcards: {
        updateMany: {
          where: {},
          data: { isConfirmed: true },
        },
      },
    },
  });
}

/**
 * Confirms usage: transitions PENDING → AWAITING_PAYMENT, marks cards USED.
 * Returns adjustedTotal for the caller to use.
 */
export async function confirmOrderUsage(orderId: string, giftcards: Prisma.GiftcardGetPayload<true>[], buyRate: Prisma.Decimal) {
  const adjustedTotal = computeEffectiveTotalDecimal(giftcards, buyRate);

  return prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'AWAITING_PAYMENT', adjustedTotal },
    });

    for (const card of giftcards) {
      await tx.giftcard.update({
        where: { id: card.id },
        data: {
          status: card.status === 'UNUSED' ? 'USED' : card.status,
          isConfirmed: true,
        },
      });
    }

    return { order: updatedOrder, adjustedTotal };
  });
}

/**
 * Completes an order: records payment and increments platform balance.
 * Throws OrderAlreadyProcessedError if order was already completed.
 */
export async function completeOrderPayment(orderId: string, txId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    logger.warn('OrderNotFoundError en completeOrderPayment', { flow: 'order', action: 'complete-payment', metadata: { orderId } });
    throw new OrderNotFoundError();
  }
  if (order.status !== 'AWAITING_PAYMENT') {
    logger.warn('InvalidOrderStateError en completeOrderPayment', { flow: 'order', action: 'complete-payment', userId: order.userId, metadata: { orderId, actualStatus: order.status } });
    throw new InvalidOrderStateError('La orden debe estar en estado AWAITING_PAYMENT');
  }

  const paymentAmount = order.adjustedTotal ?? order.total;

  try {
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
          binanceTxId: txId,
          relatedUserId: order.userId,
        },
      });

      await tx.order.update({
        where: { id: order.id, status: 'AWAITING_PAYMENT' },
        data: { status: 'COMPLETED' },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      logger.warn('OrderAlreadyProcessedError en completeOrderPayment', { flow: 'order', action: 'complete-payment', userId: order.userId, metadata: { orderId, txId } });
      throw new OrderAlreadyProcessedError('La orden ya fue procesada por otra solicitud.');
    }
    logger.error('Error inesperado en transacción de completeOrderPayment', {
      flow: 'order',
      action: 'complete-payment',
      userId: order.userId,
      metadata: { orderId, txId, paymentAmount: paymentAmount.toString() },
      error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown', stack: err instanceof Error ? err.stack : undefined },
    });
    throw err;
  }

  return { orderId: order.id, paymentAmount: paymentAmount.toNumber() };
}
