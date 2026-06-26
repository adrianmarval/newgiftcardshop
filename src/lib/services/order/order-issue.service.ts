import { Prisma } from '@/generated/prisma/client';
import { GiftcardIssueType, GiftcardStatus } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';
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
    select: { status: true },
  });
  if (!order) throw new Error('Orden no encontrada');
  if (order.status !== 'PENDING') {
    throw new Error('No se pueden reportar problemas en una orden que ya fue confirmada');
  }

  const card = await prisma.giftcard.findUnique({
    where: { id: giftcardId },
    select: { ownerId: true, orderId: true },
  });

  if (!card) throw new Error('Giftcard not found');
  if (card.orderId !== orderId) throw new Error('La tarjeta no pertenece a esta orden');

  return prisma.$transaction(async (tx) => {
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
    select: { status: true },
  });
  if (!order) throw new Error('Orden no encontrada');
  if (order.status !== 'PENDING') {
    throw new Error('No se pueden modificar reportes en una orden que ya fue confirmada');
  }

  return prisma.$transaction(async (tx) => {
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
