// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Giftcards / Issues — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardIssueType } from '@/generated/prisma/enums';

export const reportIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().positive().optional(),
  proofImageUrl: z.string().optional(),
});

export const reportIssueOutputSchema = z.object({
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

export const undoIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
});

export const undoIssueOutputSchema = z.object({ success: z.literal(true) });
