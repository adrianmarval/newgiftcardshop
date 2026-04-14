// ─────────────────────────────────────────────────────────────────────────────
// Giftcard Types — GiftcardIssue entity
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

/**
 * A buyer-reported issue on a gift card within an order.
 * Created via reportGiftcardIssue() and stored in GiftcardIssue.
 */
export const giftcardIssueSchema = z.object({
  id: z.string(),
  issueType: z.enum(["INVALID", "ALREADY_USED", "DEACTIVATED", "WRONG_AMOUNT"]),
  /** CRITICAL FIX: must be nullable + optional since buyer may not report an amount */
  reportedAmount: z.number().nullable().optional(),
  /** CRITICAL FIX: must be nullable + optional since proof image is optional */
  proofImageUrl: z.string().nullable().optional(),
  giftcardId: z.string(),
  orderId: z.string(),
  reportedById: z.string(),
  sellerId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type GiftcardIssue = z.infer<typeof giftcardIssueSchema>;
