'use server';

import { z } from 'zod';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { GiftcardIssueType } from '@/generated/prisma/enums';
import { reportGiftcardIssue } from '@/lib/services/order';

const reportIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
});

const reportIssueOutputSchema = z.object({
  success: z.literal(true),
  issue: z.object({
    id: z.string(),
    issueType: z.string(),
    reportedAmount: z.number().nullable().optional(),
    proofImageUrl: z.string().nullable().optional(),
    giftcardId: z.string(),
    orderId: z.string(),
    reportedById: z.string(),
    sellerId: z.string().nullable().optional(),
    createdAt: z.string(),
  }),
});

export const reportIssue = buyerActionClient
  .inputSchema(reportIssueInputSchema)
  .outputSchema(reportIssueOutputSchema)
  .action(async ({ parsedInput: { giftcardId, orderId, issueType, reportedAmount, proofImageUrl }, ctx }) => {
    if (issueType === 'WRONG_AMOUNT' && !reportedAmount) {
      throw new ActionError('El monto reportado es obligatorio para el tipo de problema MONTO_INCORRECTO');
    }

    try {
      const issue = await reportGiftcardIssue({
        giftcardId,
        orderId,
        userId: ctx.auth.user.id,
        issueType,
        reportedAmount,
        proofImageUrl,
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
    } catch (err) {
      throw new ActionError((err as Error).message || 'Error al reportar problema');
    }
  });
