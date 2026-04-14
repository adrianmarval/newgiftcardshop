// ─────────────────────────────────────────────────────────────────────────────
// Giftcard Types — Core gift card entities
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

/** String-literal mirror of the Prisma GiftcardStatus enum — safe for client components. */
export type GiftcardStatus = "USED" | "UNUSED" | "ALREADY_USED" | "INVALID" | "DEACTIVATED" | "WRONG_AMOUNT";

export const giftcardStatusEnum = z.enum(["USED", "UNUSED", "ALREADY_USED", "INVALID", "DEACTIVATED", "WRONG_AMOUNT"]);

/**
 * A gift card as returned from server actions that include brand/country
 * relations. The brand and country are lightweight sub-selections.
 */
export const giftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  /** May contain any GiftcardStatus value or a raw string from older data. */
  status: z.union([giftcardStatusEnum, z.string()]),
  isConfirmed: z.boolean(),
  /** Amount reported by the buyer when using/redeeming the card */
  reportedAmount: z.number().nullable().optional(),
  orderId: z.string().nullable(),
  batchId: z.string().nullable().optional(),
  brand: z.object({ name: z.string(), icon: z.string(), image: z.string().nullable() }),
  country: z.object({ name: z.string(), code: z.string() }).nullable(),
});

export type Giftcard = z.infer<typeof giftcardSchema>;

/** A single gift-card parsed from the bulk-paste dialog. */
export interface ParsedGiftCard {
  amount: string;
  claimCode: string;
}
