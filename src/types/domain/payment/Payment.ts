// ─────────────────────────────────────────────────────────────────────────────
// Payment — Payment entity shared across buyer orders and seller batches.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const paymentDirectionEnum = z.enum(['CREDIT', 'DEBIT']);
export type PaymentDirection = z.infer<typeof paymentDirectionEnum>;

export const paymentCategoryEnum = z.enum(['ORDER', 'BATCH', 'DEPOSIT', 'REFUND_BUYER', 'REFUND_SELLER']);
export type PaymentCategory = z.infer<typeof paymentCategoryEnum>;

export const paymentReferenceTypeEnum = z.enum(['ORDER', 'BATCH', 'MANUAL']);

export type PaymentReferenceType = z.infer<typeof paymentReferenceTypeEnum>;

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
 *   createdAt: "2024-01-15T10:30:00Z"
 * }
 */
export const paymentSchema = z.object({
  /** Unique payment identifier. */
  id: z.string(),
  /** Transaction amount in USDT. */
  amount: z.number(),
  /** Account balance after the transaction completed. */
  balanceAfter: z.number(),
  /** Accounting direction: does this move money in or out of the caja? */
  direction: paymentDirectionEnum,
  /** Business reason for this payment */
  category: paymentCategoryEnum,
  /** Binance transaction ID (for external reference) */
  binanceTxId: z.string().optional(),
  /** User involved in the transaction (buyer or seller) */
  relatedUserId: z.string().optional(),
  relatedUserName: z.string().optional(),
  /** Internal notes for manual transactions */
  notes: z.string().optional(),
  /** Reference type for linking to Order, Batch, or manual */
  referenceType: paymentReferenceTypeEnum.optional(),
  /** ID of the referenced Order or Batch */
  referenceId: z.string().optional(),
  /** ISO 8601 timestamp when payment was created. */
  createdAt: z.string(),
});

/** TypeScript type for a serialized Payment object. */
export type Payment = z.infer<typeof paymentSchema>;

/** Input for creating a deposit (money returned to platform by seller) */
export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  relatedUserId: z.string().min(1, 'Seller is required'),
  binanceTxId: z.string().optional(),
  notes: z.string().optional(),
});

export type DepositInput = z.infer<typeof depositSchema>;

/** Input for creating a refund */
export const refundSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  refundType: z.enum(['BUYER', 'SELLER']),
  relatedUserId: z.string().min(1, 'User is required'),
  referenceType: z.enum(['ORDER', 'BATCH']),
  referenceId: z.string().min(1, 'Reference ID is required'),
  notes: z.string().optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;
