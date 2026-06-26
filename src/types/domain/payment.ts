// ─────────────────────────────────────────────────────────────────────────────
// Payment — Entity types + shared Zod schema
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { PaymentDirection, PaymentCategory, PaymentReferenceType } from '@/generated/prisma/enums';
import { PaymentDirection as PaymentDirectionEnum, PaymentCategory as PaymentCategoryEnum, PaymentReferenceType as PaymentReferenceTypeEnum } from '@/generated/prisma/enums';

export { PaymentDirection, PaymentCategory };

// ── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  balanceAfter: number;
  direction: PaymentDirection;
  category: PaymentCategory;
  binanceTxId?: string | null;
  relatedUserId?: string | null;
  relatedUserName?: string | null;
  relatedUserEmail?: string | null;
  notes?: string | null;
  referenceType?: PaymentReferenceType | null;
  referenceId?: string | null;
  orderId?: string | null;
  batchId?: number | null;
  createdAt: string;
}

/** Shared Zod schema for payment in list actions */
export const paymentListItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  direction: z.enum(PaymentDirectionEnum),
  category: z.enum(PaymentCategoryEnum),
  createdAt: z.string(),
});

/** Extended payment schema with admin/seller fields */
export const paymentDetailListItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  direction: z.enum(PaymentDirectionEnum),
  category: z.enum(PaymentCategoryEnum),
  binanceTxId: z.string().optional(),
  relatedUserId: z.string().optional(),
  notes: z.string().optional(),
  referenceType: z.enum(PaymentReferenceTypeEnum).optional(),
  referenceId: z.string().optional(),
  createdAt: z.string(),
});
