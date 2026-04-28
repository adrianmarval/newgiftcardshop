'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { reportGiftcardIssueSchema, reportGiftcardIssueOutputSchema } from '@/types/application/buy-flow';

export const reportGiftcardIssue = buyerActionClient
  .inputSchema(reportGiftcardIssueSchema)
  .outputSchema(reportGiftcardIssueOutputSchema)
  .useValidated(async ({ parsedInput: { issueType, reportedAmount, orderId, giftcardId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No autorizado');
    if (issueType === 'WRONG_AMOUNT' && !reportedAmount) {
      throw new ActionError('El monto reportado es obligatorio para el tipo de problema MONTO_INCORRECTO');
    }
    const existingIssue = await prisma.giftcardIssue.findFirst({
      where: { giftcardId, orderId, reportedById: ctx.auth.user.id },
    });
    if (existingIssue) throw new ActionError('Ya has reportado un problema con esta tarjeta en esta orden');
    const foundGiftcard = await prisma.giftcard.findUnique({
      where: { id: giftcardId },
      select: { ownerId: true },
    });
    if (!foundGiftcard) throw new ActionError('Giftcard not found');
    return next({ ctx: { foundGiftcard } });
  })
  .action(async ({ parsedInput: { giftcardId, orderId, issueType, reportedAmount, proofImageUrl }, ctx }) => {
    const issue = await prisma.$transaction(async (tx) => {
      const createdIssue = await tx.giftcardIssue.create({
        data: {
          issueType,
          reportedAmount: reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
          proofImageUrl: proofImageUrl,
          giftcardId: giftcardId,
          orderId: orderId,
          reportedById: ctx.auth.user.id,
          sellerId: ctx.foundGiftcard.ownerId ?? undefined,
        },
      });
      await tx.giftcard.update({
        where: { id: giftcardId },
        data: {
          status: issueType,
          reportedAmount: issueType === 'WRONG_AMOUNT' && reportedAmount != null ? new Prisma.Decimal(reportedAmount) : undefined,
        },
      });
      return createdIssue;
    });
    return {
      success: true as const,
      issue: {
        id: issue.id,
        issueType: issue.issueType,
        reportedAmount: issue.reportedAmount ? issue.reportedAmount.toNumber() : null,
        proofImageUrl: issue.proofImageUrl,
        giftcardId: issue.giftcardId,
        orderId: issue.orderId,
        reportedById: issue.reportedById,
        sellerId: issue.sellerId,
        createdAt: issue.createdAt.toISOString(),
      },
    };
  });
