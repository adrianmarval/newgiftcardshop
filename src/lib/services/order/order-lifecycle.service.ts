import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { computeEffectiveTotalDecimal } from '@/lib/services/pricing';
import { OrderNotFoundError, InvalidOrderStateError, OrderAlreadyProcessedError, PaymentVerificationError } from './order-errors';
import { validateBuyerPayment } from '@/lib/services/payment/buyer-payment.service';
import { logger } from '@/lib/logger';

/**
 * Cancels an order and marks all giftcards as confirmed.
 */
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId, status: 'PENDING' },
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
    return order;
  });
}

/**
 * Confirms usage: transitions PENDING → AWAITING_PAYMENT, marks cards USED.
 * Returns adjustedTotal for the caller to use.
 */
export async function confirmOrderUsage(orderId: string, buyRate: Prisma.Decimal) {
  return prisma.$transaction(async (tx) => {
    const freshCards = await tx.giftcard.findMany({
      where: { orderId },
    });

    const adjustedTotal = computeEffectiveTotalDecimal(freshCards, buyRate);

    const updatedOrder = await tx.order.update({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'AWAITING_PAYMENT', adjustedTotal },
    });

    for (const card of freshCards) {
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
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new OrderNotFoundError();
      }
      if (order.status !== 'AWAITING_PAYMENT') {
        throw new InvalidOrderStateError('La orden debe estar en estado AWAITING_PAYMENT');
      }

      const paymentAmount = order.adjustedTotal ?? order.total;

      // ── Verify TxID against Binance Pay API ──────────────────────────────
      const verification = await validateBuyerPayment(txId, paymentAmount.toString(), orderId);
      if (!verification.isValid) {
        throw new PaymentVerificationError(verification.code, verification.message);
      }

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

      return { orderId: order.id, paymentAmount: paymentAmount.toNumber(), userId: order.userId };
    });

    // ── Notify admin (fire-and-forget — outside tx) ──────────────────────────
    const { notifyAdminPaymentReceived } = await import('@/lib/notifications/notification.service');
    const buyer = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { name: true, email: true },
    });
    const buyerName = buyer?.name || buyer?.email || 'Buyer';

    notifyAdminPaymentReceived(result.orderId, buyerName, result.paymentAmount, txId).catch((err) =>
      logger.error('Error notificando admin sobre pago recibido', {
        flow: 'order',
        action: 'complete-payment',
        metadata: { orderId: result.orderId, userId: result.userId },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
      }),
    );

    return { orderId: result.orderId, paymentAmount: result.paymentAmount };
  } catch (err) {
    if (err instanceof OrderNotFoundError || err instanceof InvalidOrderStateError || err instanceof PaymentVerificationError) {
      throw err;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      logger.warn('OrderAlreadyProcessedError en completeOrderPayment', { flow: 'order', action: 'complete-payment', metadata: { orderId, txId } });
      throw new OrderAlreadyProcessedError('La orden ya fue procesada por otra solicitud.');
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      logger.warn('Duplicate binanceTxId en completeOrderPayment', { flow: 'order', action: 'complete-payment', metadata: { orderId, txId } });
      throw new PaymentVerificationError('DUPLICATE', 'Este TxID ya fue utilizado para otro pago.');
    }
    logger.error('Error inesperado en transacción de completeOrderPayment', {
      flow: 'order',
      action: 'complete-payment',
      metadata: { orderId, txId },
      error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown', stack: err instanceof Error ? err.stack : undefined },
    });
    throw err;
  }
}
