// ─────────────────────────────────────────────────────────────────────────────
// Order Types — BuyerOrder, OrderStatus
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardSchema } from '@/types/giftcard/giftcard';
import { paymentSchema } from '@/types/order/payments';

// ── Order Status ──────────────────────────────────────────────────────────────

export const orderStatusEnum = z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']);

export type OrderStatus = z.infer<typeof orderStatusEnum>;

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
  giftcards: z.array(giftcardSchema),
  payments: z.array(paymentSchema),
  /** Sum of effective values of all cards (using buyer's rate). $0 if all cards INVALID/ALREADY_USED/DEACTIVATED. */
  effectiveTotal: z.number(),
});

export type BuyerOrder = z.infer<typeof buyerOrderSchema>;
