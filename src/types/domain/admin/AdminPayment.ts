// ─────────────────────────────────────────────────────────────────────────────
// Admin — Payment entity for admin dashboard
// Extended version of Payment with admin-specific fields for management.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { paymentSchema } from '@/types/domain/payment/Payment';

export const adminPaymentSchema = paymentSchema.extend({
  binanceTxId: z.string().optional().nullable(),
  relatedUserId: z.string().optional().nullable(),
  relatedUserName: z.string().optional().nullable(),
  relatedUserEmail: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  referenceType: z.enum(['ORDER', 'BATCH', 'MANUAL']).optional().nullable(),
  referenceId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  batchId: z.number().optional().nullable(),
});

export type AdminPayment = z.infer<typeof adminPaymentSchema>;
