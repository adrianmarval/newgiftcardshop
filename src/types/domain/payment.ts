// ─────────────────────────────────────────────────────────────────────────────
// Payment — Entity types + shared Zod schema
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { PaymentDirection, PaymentCategory, PaymentStatus, PaymentReferenceType } from '@/generated/prisma/enums';
import { PaymentDirection as PaymentDirectionEnum, PaymentCategory as PaymentCategoryEnum, PaymentStatus as PaymentStatusEnum, PaymentReferenceType as PaymentReferenceTypeEnum } from '@/generated/prisma/enums';

export { PaymentDirection, PaymentCategory, PaymentStatus };

// ── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  balanceAfter: number;
  direction: PaymentDirection;
  category: PaymentCategory;
  status: PaymentStatus;
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
  binanceTxId: z.string().nullable().optional(),
  relatedUserId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  referenceType: z.enum(PaymentReferenceTypeEnum).nullable().optional(),
  referenceId: z.string().nullable().optional(),
  createdAt: z.string(),
});
