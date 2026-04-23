// ─────────────────────────────────────────────────────────────────────────────
// Payment — Payment entity shared across buyer orders and seller batches.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Payment lifecycle states.
 *
 * - PENDING: Payment initiated but not yet confirmed
 * - COMPLETED: Payment successfully processed
 * - CANCELLED: Payment was cancelled or failed
 */
export const paymentStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);

/** Type derived from paymentStatusEnum. Use this for PaymentStatus in component props. */
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

/**
 * Serialized Payment as returned to client components.
 *
 * Schema-first: This is the single source of truth for payment shape across the app.
 * Both buyer orders (when completing a purchase) and seller batches (when receiving payout)
 * use this same schema.
 *
 * @example
 * // In a BuyerOrder:
 * {
 *   id: "pay_123",
 *   amount: 50.00,
 *   balanceAfter: 150.00,
 *   status: "COMPLETED",
 *   createdAt: "2024-01-15T10:30:00Z"
 * }
 */
export const paymentSchema = z.object({
  /** Unique payment identifier. */
  id: z.string(),
  /** Transaction amount in user's currency. */
  amount: z.number(),
  /** Account balance after the transaction completed. */
  balanceAfter: z.number(),
  /** Current payment status. */
  status: paymentStatusEnum,
  /** ISO 8601 timestamp when payment was created. */
  createdAt: z.string(),
});

/** TypeScript type for a serialized Payment object. */
export type Payment = z.infer<typeof paymentSchema>;
