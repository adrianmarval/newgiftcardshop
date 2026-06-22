'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { GiftcardIssueType } from '@/generated/prisma/enums';

const reportIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
});

const reportIssueOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    issue: z.object({
      id: z.string(),
      issueType: z.enum(GiftcardIssueType),
      reportedAmount: z.number().nullable().optional(),
      proofImageUrl: z.string().nullable().optional(),
      giftcardId: z.string(),
      orderId: z.string(),
      reportedById: z.string(),
      sellerId: z.string().nullable().optional(),
      createdAt: z.string(),
    }),
  }),
  z.object({ error: z.string() }),
]);

export const reportIssue = buyerActionClient
  .inputSchema(reportIssueInputSchema)
  .outputSchema(reportIssueOutputSchema)
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
      select: { ownerId: true, orderId: true },
    });
    if (!foundGiftcard) throw new ActionError('Giftcard not found');
    if (foundGiftcard.orderId !== orderId) throw new ActionError('La tarjeta no pertenece a esta orden');
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
