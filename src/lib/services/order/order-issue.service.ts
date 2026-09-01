import { Prisma } from '@/generated/prisma/client';
import { GiftcardIssueType, GiftcardStatus } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ReportIssueParams } from '@/types';

/**
 * Reports an issue with a gift card. Creates the issue and updates card status.
 * Deletes any existing issue for the same card/order/user first (allows re-reporting).
 * Only allowed on PENDING orders — confirmed/completed orders cannot be modified.
 */
export async function reportGiftcardIssue(params: ReportIssueParams) {
  const { giftcardId, orderId, userId, issueType, reportedAmount, proofImageUrl } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true },
  });
  if (!order) {
    logger.warn('reportGiftcardIssue: orden no encontrada', { flow: 'order', action: 'report-issue', userId, metadata: { orderId } });
    throw new Error('Orden no encontrada');
  }
  if (order.userId !== userId) {
    logger.warn('reportGiftcardIssue: la orden no pertenece al usuario', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { orderId },
    });
    throw new Error('No autorizado');
  }
  if (order.status !== 'PENDING') {
    logger.warn('reportGiftcardIssue: orden no está pendiente', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { orderId, status: order.status },
    });
    throw new Error('No se pueden reportar problemas en una orden que ya fue confirmada');
  }

  const card = await prisma.giftcard.findUnique({
    where: { id: giftcardId },
    select: { ownerId: true, orderId: true, amount: true },
  });

  if (!card) {
    logger.warn('reportGiftcardIssue: giftcard no encontrada', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { giftcardId, orderId },
    });
    throw new Error('Giftcard not found');
  }
  if (card.orderId !== orderId) {
    logger.warn('reportGiftcardIssue: tarjeta no pertenece a la orden', {
      flow: 'order',
      action: 'report-issue',
      userId,
      metadata: { giftcardId, orderId, cardOrderId: card.orderId },
    });
    throw new Error('La tarjeta no pertenece a esta orden');
  }

  // El monto reportado alimenta DIRECTO el adjustedTotal del buyer y el payout
  // del seller (computeEffectiveTotal/computeFaceValueTotal) — sin este bound,
  // un reportedAmount > valor facial infla el payout del seller.
  if (issueType === 'WRONG_AMOUNT') {
    const reported = reportedAmount != null ? new Prisma.Decimal(reportedAmount) : null;
    if (!reported || reported.lte(0) || reported.gt(card.amount)) {
      logger.warn('reportGiftcardIssue: monto reportado fuera de rango', {
        flow: 'order',
        action: 'report-issue',
        userId,
        metadata: { giftcardId, orderId, reportedAmount, cardAmount: card.amount.toString() },
      });
      throw new Error('El monto reportado debe ser mayor a 0 y no puede superar el valor de la tarjeta');
    }
  }

  return prisma.$transaction(async (tx) => {
    // Guard atómico DENTRO de la tx: lockea la fila de la orden y re-valida el
    // status. Si otro canal confirmó/canceló la orden entre el pre-check y este
    // punto (race cross-canal web/bot), el update no matchea → P2025 → error
    // amigable, y nunca se escribe un reporte sobre una orden ya confirmada.
    try {
      await tx.order.update({
        where: { id: orderId, status: 'PENDING' },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        logger.warn('reportGiftcardIssue: orden dejó de estar pendiente durante la tx (race cross-canal)', {
          flow: 'order',
          action: 'report-issue',
          userId,
          metadata: { orderId },
        });
        throw new Error('No se pueden reportar problemas en una orden que ya fue confirmada');
      }
      throw err;
    }

    await tx.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: userId },
    });

    const issue = await tx.giftcardIssue.create({
      data: {
        issueType: issueType as GiftcardIssueType,
        reportedAmount: reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
        proofImageUrl,
        giftcardId,
        orderId,
        reportedById: userId,
        sellerId: card.ownerId ?? undefined,
      },
    });

    await tx.giftcard.update({
      where: { id: giftcardId },
      data: {
        status: issueType as GiftcardStatus,
        reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
      },
    });

    return issue;
  });
}

/**
 * Deletes all issues for a giftcard/order/user and resets card status to UNUSED if no remaining issues.
 * Only allowed on PENDING orders.
 */
export async function deleteGiftcardIssue(giftcardId: string, orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true },
  });
  if (!order) {
    logger.warn('deleteGiftcardIssue: orden no encontrada', { flow: 'order', action: 'delete-issue', userId, metadata: { orderId } });
    throw new Error('Orden no encontrada');
  }
  if (order.userId !== userId) {
    logger.warn('deleteGiftcardIssue: la orden no pertenece al usuario', {
      flow: 'order',
      action: 'delete-issue',
      userId,
      metadata: { orderId },
    });
    throw new Error('No autorizado');
  }
  if (order.status !== 'PENDING') {
    logger.warn('deleteGiftcardIssue: orden no está pendiente', {
      flow: 'order',
      action: 'delete-issue',
      userId,
      metadata: { orderId, status: order.status },
    });
    throw new Error('No se pueden modificar reportes en una orden que ya fue confirmada');
  }

  return prisma.$transaction(async (tx) => {
    // Guard atómico DENTRO de la tx (mismo patrón que reportGiftcardIssue):
    // lockea la fila y re-valida status — evita resetear una card a UNUSED en
    // una orden que otro canal acaba de confirmar (race cross-canal web/bot).
    try {
      await tx.order.update({
        where: { id: orderId, status: 'PENDING' },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        logger.warn('deleteGiftcardIssue: orden dejó de estar pendiente durante la tx (race cross-canal)', {
          flow: 'order',
          action: 'delete-issue',
          userId,
          metadata: { orderId },
        });
        throw new Error('No se pueden modificar reportes en una orden que ya fue confirmada');
      }
      throw err;
    }

    await tx.giftcardIssue.deleteMany({
      where: { giftcardId, orderId, reportedById: userId },
    });

    const remaining = await tx.giftcardIssue.findFirst({ where: { giftcardId } });
    if (!remaining) {
      await tx.giftcard.update({
        where: { id: giftcardId },
        data: { status: 'UNUSED', reportedAmount: null },
      });
    }
  });
}
