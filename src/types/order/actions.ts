// ─────────────────────────────────────────────────────────────────────────────
// Order Types — Input/Output schemas for order actions
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { buyerOrderSchema } from './buyer-order';

// ── Get User Buy Rate ─────────────────────────────────────────────────────────

/** Output schema for getUserBuyRate action */
export const getUserBuyRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

// ── Create Order ───────────────────────────────────────────────────────────────

/** Input schema for createOrder action */
export const createOrderInputSchema = z.object({
  giftcardIds: z.array(z.string()),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

/** Output schema for createOrder action */
export const createOrderOutputSchema = z.union([
  z.object({ success: z.literal(true), orderId: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Confirm Order Usage ───────────────────────────────────────────────────────

/** Input schema for confirmOrderUsage action */
export const confirmOrderUsageInputSchema = z.object({ orderId: z.string() });

export type ConfirmOrderUsageInput = z.infer<typeof confirmOrderUsageInputSchema>;

/** Output schema for confirmOrderUsage action */
export const confirmOrderUsageOutputSchema = z.union([
  z.object({ success: z.literal(true), adjustedTotal: z.number() }),
  z.object({ error: z.string() }),
]);

// ── Complete Order ────────────────────────────────────────────────────────────

/** Input schema for completeOrder action */
export const completeOrderInputSchema = z.object({
  orderId: z.string(),
  _transactionId: z.string(),
});

export type CompleteOrderInput = z.infer<typeof completeOrderInputSchema>;

/** Output schema for completeOrder action */
export const completeOrderOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    orderId: z.string(),
    message: z.string(),
  }),
  z.object({ error: z.string() }),
]);

// ── Cancel Order ──────────────────────────────────────────────────────────────

/** Input schema for cancelOrder action */
export const cancelOrderInputSchema = z.object({ orderId: z.string() });

export type CancelOrderInput = z.infer<typeof cancelOrderInputSchema>;

/** Output schema for cancelOrder action */
export const cancelOrderOutputSchema = z.union([
  z.object({ success: z.literal(true), message: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Get Order By ID ──────────────────────────────────────────────────────────

/** Input schema for getOrderById action */
export const getOrderByIdInputSchema = z.object({ orderId: z.string() });

export type GetOrderByIdInput = z.infer<typeof getOrderByIdInputSchema>;

/** Output schema for getOrderById action */
export const getOrderByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), order: buyerOrderSchema }),
  z.object({ error: z.string() }),
]);

// ── Get Buyer Orders ──────────────────────────────────────────────────────────

/** Input schema for getBuyerOrders action */
export const getBuyerOrdersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export type GetBuyerOrdersInput = z.infer<typeof getBuyerOrdersInputSchema>;

/** Output schema for getBuyerOrders action */
export const getBuyerOrdersOutputSchema = z.object({
  success: z.literal(true),
  orders: z.array(buyerOrderSchema),
  totalCount: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});
