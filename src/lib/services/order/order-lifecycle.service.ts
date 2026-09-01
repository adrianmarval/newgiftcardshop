import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { computeEffectiveTotalDecimal } from '@/lib/services/pricing';
import { autoCancelEligibleBatchesForOrder } from '@/lib/services/giftcard/batch-cancel.service';
import { triggerAutoPayForOrder } from '@/lib/services/payment/auto-pay.service';
import { OrderNotFoundError, InvalidOrderStateError, OrderAlreadyProcessedError, PaymentVerificationError } from './order-errors';
import { validateBuyerPayment } from '@/lib/services/payment/buyer-payment.service';
import { publishToRole, publishToUser, publishToUsers } from '@/lib/realtime/bus';
import { logger } from '@/lib/logger';

/**
 * Fires the auto-pay trigger post-commit (fire-and-forget). No-op when the
 * auto_pay_sellers setting is disabled. Never breaks the lifecycle flow.
 */
function fireAutoPayTrigger(orderId: string): void {
  triggerAutoPayForOrder(orderId).catch((err) =>
    logger.error('Error en trigger de auto-pay post-commit', {
      flow: 'payment',
      action: 'auto-pay-trigger',
      metadata: { orderId },
      error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
    }),
  );
}

/**
 * Cancels an order and marks all giftcards as confirmed.
 * Auto-cancels eligible batches (payable = 0, all cards confirmed).
 */
export async function cancelOrder(orderId: string) {
  const { order, cancelledBatches } = await prisma.$transaction(async (tx) => {
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

    const cancelledBatches = await autoCancelEligibleBatchesForOrder(tx, orderId);

    return { order, cancelledBatches };
  });

  // Notify sellers outside tx (fire-and-forget)
  if (cancelledBatches.length > 0) {
    const { notifySellerBatchCancelled } = await import('@/lib/notifications');
    for (const { batchId, sellerId } of cancelledBatches) {
      if (sellerId) {
        notifySellerBatchCancelled(sellerId, batchId).catch((err) =>
          logger.error('Error notificando seller post-auto-cancel', {
            flow: 'batch',
            action: 'auto-cancel',
            metadata: { batchId, sellerId },
            error: { name: err.name, message: err.message },
          }),
        );
      }
    }
  }

  // Invalidación realtime (cross-canal: web y bot pasan por acá)
  publishToUser(order.userId, ['orders', 'stats']);
  publishToUsers(
    cancelledBatches.map((b) => b.sellerId).filter((id): id is string => Boolean(id)),
    ['batches', 'stats'],
  );
  publishToRole('ADMIN', ['orders']);

  // Auto-pay trigger (no-op when disabled, fire-and-forget)
  fireAutoPayTrigger(orderId);
}

/**
 * Confirms usage: transitions PENDING → AWAITING_PAYMENT, marks cards USED.
 * Auto-cancels eligible batches (payable = 0, all cards confirmed).
 * Returns adjustedTotal + cancelled batches for post-commit notifications.
 */
export async function confirmOrderUsage(orderId: string, buyRate: Prisma.Decimal) {
  const { order, adjustedTotal, cancelledBatches } = await prisma.$transaction(async (tx) => {
    // Transición de status PRIMERO: el update guardado lockea la fila de la orden
    // por el resto de la tx (P2025 si otro canal ya la transicionó). Un reporte
    // de issue concurrente bloquea en su propio guard hasta que esta tx commitea
    // y entonces falla limpio — nunca se cuela un cambio de card post-cálculo.
    await tx.order.update({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'AWAITING_PAYMENT' },
    });

    // Leer las cards DESPUÉS del lock: los reportes o ya commitearon (visibles
    // acá) o fallarán su guard al despertar — el adjustedTotal siempre refleja
    // el estado final de las cards.
    const freshCards = await tx.giftcard.findMany({
      where: { orderId },
    });

    const adjustedTotal = computeEffectiveTotalDecimal(freshCards, buyRate);

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { adjustedTotal },
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

    const cancelledBatches = await autoCancelEligibleBatchesForOrder(tx, orderId);

    return { order: updatedOrder, adjustedTotal, cancelledBatches };
  });

  // Notify sellers outside tx (fire-and-forget)
  if (cancelledBatches.length > 0) {
    const { notifySellerBatchCancelled } = await import('@/lib/notifications');
    for (const { batchId, sellerId } of cancelledBatches) {
      if (sellerId) {
        notifySellerBatchCancelled(sellerId, batchId).catch((err) =>
          logger.error('Error notificando seller post-auto-cancel', {
            flow: 'batch',
            action: 'auto-cancel',
            metadata: { batchId, sellerId },
            error: { name: err.name, message: err.message },
          }),
        );
      }
    }
  }

  // Invalidación realtime (cross-canal: web y bot pasan por acá)
  publishToUser(order.userId, ['orders', 'stats']);
  publishToUsers(
    cancelledBatches.map((b) => b.sellerId).filter((id): id is string => Boolean(id)),
    ['batches', 'stats'],
  );
  publishToRole('ADMIN', ['orders']);

  // Auto-pay trigger (no-op when disabled, fire-and-forget)
  fireAutoPayTrigger(orderId);

  return { order, adjustedTotal };
}

/**
 * Completes an order: records payment and increments platform balance.
 * Throws OrderAlreadyProcessedError if order was already completed.
 */
export async function completeOrderPayment(orderId: string, txId: string) {
  try {
    // Read + verificación Binance FUERA de la tx: la llamada HTTP a Binance no
    // puede vivir dentro de la transacción — mantiene la conexión del pool (y
    // cualquier lock) durante un round-trip de red. El status se re-valida
    // DENTRO de la tx (fast-path aquí, guard real allá + update guardado).
    const orderSnapshot = await prisma.order.findUnique({ where: { id: orderId } });
    if (!orderSnapshot) {
      throw new OrderNotFoundError();
    }
    if (orderSnapshot.status !== 'AWAITING_PAYMENT') {
      throw new InvalidOrderStateError('La orden debe estar en estado AWAITING_PAYMENT');
    }
    const paymentAmount = orderSnapshot.adjustedTotal ?? orderSnapshot.total;

    // ── Verify TxID against Binance Pay API ──────────────────────────────
    const verification = await validateBuyerPayment(txId, paymentAmount.toString(), orderId);
    if (!verification.isValid) {
      throw new PaymentVerificationError(verification.code, verification.message);
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new OrderNotFoundError();
      }
      if (order.status !== 'AWAITING_PAYMENT') {
        throw new InvalidOrderStateError('La orden debe estar en estado AWAITING_PAYMENT');
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

    // Invalidación realtime: orden completada + payment CREDIT registrado
    publishToUser(result.userId, ['orders', 'stats']);
    publishToRole('ADMIN', ['orders', 'payments']);

    return { orderId: result.orderId, paymentAmount: result.paymentAmount };
  } catch (err) {
    if (err instanceof OrderNotFoundError || err instanceof InvalidOrderStateError || err instanceof PaymentVerificationError) {
      throw err;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      logger.warn('OrderAlreadyProcessedError en completeOrderPayment', {
        flow: 'order',
        action: 'complete-payment',
        metadata: { orderId, txId },
      });
      throw new OrderAlreadyProcessedError('La orden ya fue procesada por otra solicitud.');
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      logger.warn('Duplicate binanceTxId en completeOrderPayment', {
        flow: 'order',
        action: 'complete-payment',
        metadata: { orderId, txId },
      });
      throw new PaymentVerificationError('DUPLICATE', 'Este TxID ya fue utilizado para otro pago.');
    }
    logger.error('Error inesperado en transacción de completeOrderPayment', {
      flow: 'order',
      action: 'complete-payment',
      metadata: { orderId, txId },
      error: {
        name: err instanceof Error ? err.name : 'Error',
        message: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    throw err;
  }
}
