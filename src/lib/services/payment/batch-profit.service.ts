// ─────────────────────────────────────────────────────────────────────────────
// Batch Profit — notificación de ganancia REALIZADA al admin (PROFIT_REALIZED).
//
// La ganancia de un batch solo se REALIZA cuando cierran AMBAS patas:
//   1. Pata buyer: todas las cards del batch están en órdenes COMPLETED (los
//      buyers pagaron) — o CANCELLED (payable 0, sin cobro).
//   2. Pata seller: el payout del batch está confirmado on-chain (Payment
//      DEBIT/BATCH en status COMPLETED — lo resuelve syncPendingSellerPayments).
//
// Trigger: el último de los dos eventos en ocurrir llama checkAndNotifySettledBatch
//   - completeOrderPayment (cierra pata buyer de las cards de esa orden)
//   - syncPendingSellerPayments status 6 (cierra pata seller; cubre payouts
//     manuales Y automáticos porque ambos pasan por el sync)
//
// Dedup una-sola-vez por batch: GiftcardBatch.profitNotifiedAt ES el claim —
// updateMany guardado (profitNotifiedAt: null) multi-instancia seguro. Si el
// dispatch falla, el claim se libera (null) y el próximo trigger reintenta.
// No retroactivo: batches saldados antes del deploy nunca reciben trigger.
//
// Fórmula (misma regla de negocio que admin-profit-stats):
//   collected = Σ faceValue(card) × order.buyRate   (solo órdenes COMPLETED)
//   paidOut   = Payment.amount del payout COMPLETED (lo realmente pagado)
//   profit    = collected − paidOut
// ─────────────────────────────────────────────────────────────────────────────

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { GiftcardStatus, PaymentDirection, PaymentCategory, PaymentStatus } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';

/** faceValue por card — misma regla que pricing.sumFaceValue. */
function faceValueOf(card: { amount: Decimal; status: string; reportedAmount: Decimal | null }): Decimal {
  if (card.status === GiftcardStatus.UNUSED || card.status === GiftcardStatus.USED) {
    return card.amount;
  }
  if (card.status === GiftcardStatus.WRONG_AMOUNT) {
    return card.reportedAmount ?? new Decimal(0);
  }
  return new Decimal(0); // INVALID / ALREADY_USED / DEACTIVATED
}

/**
 * Si el batch quedó saldado (ambas patas cerradas), notifica la ganancia
 * realizada al admin — UNA sola vez por batch. No-op en cualquier otro caso.
 * Fire-and-forget: los callers lo invocan con .catch() post-commit.
 */
export async function checkAndNotifySettledBatch(batchId: number): Promise<void> {
  const batch = await prisma.giftcardBatch.findUnique({
    where: { id: batchId },
    select: { isPaid: true, cancelledAt: true },
  });

  if (!batch?.isPaid || batch.cancelledAt) return;

  // Pata seller: el payout solo está cerrado cuando el sync lo confirma on-chain.
  const payout = await prisma.payment.findFirst({
    where: { batchId, direction: PaymentDirection.DEBIT, category: PaymentCategory.BATCH, status: PaymentStatus.COMPLETED },
    select: { amount: true },
  });
  if (!payout) return;

  // Pata buyer: ninguna card del batch puede seguir en una orden sin pagar.
  const openOrderCard = await prisma.giftcard.findFirst({
    where: { batchId, order: { status: { in: ['PENDING', 'AWAITING_PAYMENT'] } } },
    select: { id: true },
  });
  if (openOrderCard) return;

  // Claim atómico: una sola notificación por batch (multi-instancia seguro).
  const claim = await prisma.giftcardBatch.updateMany({
    where: { id: batchId, profitNotifiedAt: null },
    data: { profitNotifiedAt: new Date() },
  });
  if (claim.count !== 1) return;

  try {
    // Pata buyer: lo cobrado = Σ faceValue(card) × buyRate de su orden COMPLETED.
    const soldCards = await prisma.giftcard.findMany({
      where: { batchId, order: { status: 'COMPLETED' } },
      select: { amount: true, status: true, reportedAmount: true, order: { select: { buyRate: true } } },
    });

    let collected = new Decimal(0);
    for (const card of soldCards) {
      if (!card.order) continue;
      collected = collected.plus(faceValueOf(card).mul(card.order.buyRate));
    }

    const paidOut = payout.amount;
    const profit = collected.minus(paidOut);

    const { notifyAdminBatchProfitRealized } = await import('@/lib/notifications/notification.service');
    await notifyAdminBatchProfitRealized(
      batchId,
      collected.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      paidOut.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      profit.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    );
  } catch (err) {
    logger.error('Error notificando ganancia realizada de batch', {
      flow: 'payment',
      action: 'settled-batch-profit',
      metadata: { batchId },
      error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : String(err) },
    });
    // Liberar el claim: el próximo trigger (otro pago o sync) reintenta.
    await prisma.giftcardBatch.update({ where: { id: batchId }, data: { profitNotifiedAt: null } }).catch(() => {});
  }
}
