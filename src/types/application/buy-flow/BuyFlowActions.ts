// ─────────────────────────────────────────────────────────────────────────────
// Buy Flow — Action schemas para server actions
// Schemas de entrada/salida para searchGiftcards, reportGiftcardIssue, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardIssueType } from '@/generated/prisma/client';
import { giftcardIssueSchema } from '@/types/domain/giftcard/GiftcardIssue';

// ── Search Giftcards ─────────────────────────────────────────────────────────

/** Schema de entrada para searchGiftcards */
export const searchGiftcardSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  amount: z.number(),
});

export type SearchGiftcardInput = z.infer<typeof searchGiftcardSchema>;

/** Schema simplificado para resultado de búsqueda de gift cards. */
export const searchGiftcardItemSchema = z.object({
  id: z.string(),
  brand: z.string(),
  amount: z.number(),
  status: z.literal('UNUSED'),
});

export type SearchGiftcardItem = z.infer<typeof searchGiftcardItemSchema>;

/** Schema de salida para searchGiftcards */
export const searchGiftcardsOutputSchema = z
  .object({
    success: z.literal(true),
    giftcards: z.array(searchGiftcardItemSchema),
    error: z.string().optional(),
  })
  .strict();

// ── Get Order Cards ───────────────────────────────────────────────────────────

/** Schema de entrada para getOrderCards */
export const getOrderCardsInputSchema = z.object({ orderId: z.string() });

export type GetOrderCardsInput = z.infer<typeof getOrderCardsInputSchema>;

/** Schema para gift card en contexto de orden. */
export const orderCardItemSchema = z.object({
  id: z.string(),
  brand: z.string(),
  amount: z.number(),
  claimCode: z.string(),
  pinCode: z.string().optional(),
  status: z.string(),
  reportedAmount: z.number().optional(),
});

export type OrderCardItem = z.infer<typeof orderCardItemSchema>;

/** Schema de salida para getOrderCards */
export const getOrderCardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z.array(orderCardItemSchema),
});

// ── Report Giftcard Issue ─────────────────────────────────────────────────────

/** Schema de entrada para reportGiftcardIssue */
export const reportGiftcardIssueSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
});

export type ReportGiftcardIssueInput = z.infer<typeof reportGiftcardIssueSchema>;

/** Schema de salida para reportGiftcardIssue */
export const reportGiftcardIssueOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    issue: giftcardIssueSchema,
  }),
  z.object({ error: z.string() }),
]);

// ── Undo Giftcard Issue ───────────────────────────────────────────────────────

/** Schema de entrada para undoGiftcardIssue */
export const undoGiftcardIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
});

export type UndoGiftcardIssueInput = z.infer<typeof undoGiftcardIssueInputSchema>;

/** Schema de salida para undoGiftcardIssue */
export const undoGiftcardIssueOutputSchema = z.object({
  success: z.literal(true),
});
