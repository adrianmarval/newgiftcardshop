// ─────────────────────────────────────────────────────────────────────────────
// Giftcard Types — Input/Output schemas for giftcard buyer actions
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { GiftcardIssueType } from "@/generated/prisma/client";

// ── Search Giftcards ─────────────────────────────────────────────────────────

/** Input schema for searchGiftcards action */
export const searchGiftcardSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  amount: z.number(),
});

export type SearchGiftcardInput = z.infer<typeof searchGiftcardSchema>;

/** Item schema for giftcard search results */
export const searchGiftcardItemSchema = z.object({
  id: z.string(),
  brand: z.string(),
  amount: z.number(),
  status: z.literal("UNUSED"),
});

export type SearchGiftcardItem = z.infer<typeof searchGiftcardItemSchema>;

/** Output schema for searchGiftcards action */
export const searchGiftcardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z.array(searchGiftcardItemSchema),
});

// ── Get Order Cards ───────────────────────────────────────────────────────────

/** Input schema for getOrderCards action */
export const getOrderCardsInputSchema = z.object({ orderId: z.string() });

export type GetOrderCardsInput = z.infer<typeof getOrderCardsInputSchema>;

/** Item schema for giftcard in order context */
export const orderCardItemSchema = z.object({
  id: z.string(),
  brand: z.string(),
  amount: z.number(),
  claimCode: z.string(),
  pinCode: z.string().optional(),
  status: z.string(),
  reportedAmount: z.number().optional(),
  sellerId: z.string().optional(),
});

export type OrderCardItem = z.infer<typeof orderCardItemSchema>;

/** Output schema for getOrderCards action */
export const getOrderCardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z.array(orderCardItemSchema),
});

// ── Report Giftcard Issue ─────────────────────────────────────────────────────

/** Input schema for reportGiftcardIssue action */
export const reportGiftcardIssueSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
});

export type ReportGiftcardIssueInput = z.infer<typeof reportGiftcardIssueSchema>;

/** Issue item schema for report output */
export const giftcardIssueItemSchema = z.object({
  id: z.string(),
  issueType: z.string(),
  reportedAmount: z.number().nullable(),
  proofImageUrl: z.string().nullable(),
  giftcardId: z.string(),
  orderId: z.string(),
  reportedById: z.string(),
  sellerId: z.string().nullable(),
  createdAt: z.string(),
});

export type GiftcardIssueItem = z.infer<typeof giftcardIssueItemSchema>;

/** Output schema for reportGiftcardIssue action */
export const reportGiftcardIssueOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    issue: giftcardIssueItemSchema,
  }),
  z.object({ error: z.string() }),
]);

// ── Undo Giftcard Issue ───────────────────────────────────────────────────────

/** Input schema for undoGiftcardIssue action */
export const undoGiftcardIssueInputSchema = z.object({
  giftcardId: z.string(),
  orderId: z.string(),
});

export type UndoGiftcardIssueInput = z.infer<typeof undoGiftcardIssueInputSchema>;

/** Output schema for undoGiftcardIssue action */
export const undoGiftcardIssueOutputSchema = z.object({ success: z.literal(true) });
