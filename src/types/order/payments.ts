// ─────────────────────────────────────────────────────────────────────────────
// Order Types — Payment schema
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Enum schema for payment status values.
 */
export const paymentStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);

/** String-literal type derived from paymentStatusEnum — safe for client components. */
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

/**
 * A payment as serialized for client components.
 * Schema-first: this is the single source of truth for payment shape.
 * Used by both buyer orders and seller batches.
 */
export const paymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  status: paymentStatusEnum,
  createdAt: z.string(),
});

export type Payment = z.infer<typeof paymentSchema>;
