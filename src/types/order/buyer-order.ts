// ─────────────────────────────────────────────────────────────────────────────
// Order Types — BuyerOrder, BuyerOrderGiftcard, BuyerOrderPayment, OrderStatus
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Order Status ──────────────────────────────────────────────────────────────

export type OrderStatus = "PENDING" | "AWAITING_PAYMENT" | "COMPLETED" | "CANCELLED";

export const orderStatusEnum = z.enum(["PENDING", "AWAITING_PAYMENT", "COMPLETED", "CANCELLED"]);

// ── Buyer Order Giftcard ──────────────────────────────────────────────────────

/**
 * A gift card within an order context, serialized for client components.
 * Includes brand info and buyer's reportedAmount.
 */
export const buyerOrderGiftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable(),
  orderId: z.string().nullable(),
  brand: z.object({ name: z.string(), icon: z.string(), image: z.string().nullable() }),
  country: z.object({ name: z.string(), code: z.string() }).nullable(),
});

export type BuyerOrderGiftcard = z.infer<typeof buyerOrderGiftcardSchema>;

// ── Buyer Order Payment ───────────────────────────────────────────────────────

/**
 * CRITICAL FIX: transactionType is NOT returned by serializePayment() so it's removed.
 * serializePayment only returns: { amount, balanceAfter, createdAt }
 */
export const buyerOrderPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

export type BuyerOrderPayment = z.infer<typeof buyerOrderPaymentSchema>;

// ── Buyer Order ───────────────────────────────────────────────────────────────

/**
 * A buyer's order as returned from getBuyerOrders().
 * Includes giftcards, payments, and computed effectiveTotal.
 */
export const buyerOrderSchema = z.object({
  id: z.string(),
  status: orderStatusEnum,
  total: z.number(),
  adjustedTotal: z.number().nullable(),
  buyRate: z.number(),
  createdAt: z.string(),
  /** CRITICAL FIX: updatedAt was missing and is required */
  updatedAt: z.string(),
  giftcards: z.array(buyerOrderGiftcardSchema),
  payments: z.array(buyerOrderPaymentSchema),
  /** Sum of effective values of all cards (using buyer's rate). $0 if all cards INVALID/ALREADY_USED/DEACTIVATED. */
  effectiveTotal: z.number(),
});

export type BuyerOrder = z.infer<typeof buyerOrderSchema>;
