// ─────────────────────────────────────────────────────────────────────────────
// Admin / Payments — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { PaymentDirection, PaymentCategory, PaymentStatus, PaymentReferenceType } from '@/generated/prisma/enums';
import { paginatedOutputSchema } from '@/types';

export const listPaymentsInputSchema = z.object({
  direction: z.enum(['ALL', 'CREDIT', 'DEBIT'] as const).optional().default('ALL'),
  category: z
    .enum(['ALL', 'ORDER', 'BATCH', 'DEPOSIT', 'WITHDRAWAL', 'REFUND_BUYER', 'REFUND_SELLER'] as const)
    .optional()
    .default('ALL'),
  userId: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(20),
});

export const listPaymentsOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      balanceAfter: z.number(),
      direction: z.enum(PaymentDirection),
      category: z.enum(PaymentCategory),
      status: z.enum(PaymentStatus),
      binanceTxId: z.string().nullable(),
      relatedUserId: z.string().nullable(),
      relatedUserName: z.string().nullable(),
      relatedUserEmail: z.string().nullable(),
      notes: z.string().nullable(),
      referenceType: z.enum(PaymentReferenceType).nullable(),
      referenceId: z.string().nullable(),
      orderId: z.string().nullable(),
      batchId: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
);

export const createDepositInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  binanceTxId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const createDepositOutputSchema = z.object({
  success: z.literal(true),
  paymentId: z.string(),
  message: z.string(),
});

export const createRefundInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  refundType: z.enum(['BUYER', 'SELLER']),
  relatedUserId: z.string().trim().min(1, 'User is required'),
  referenceType: z.enum(PaymentReferenceType),
  referenceId: z.string().trim().min(1, 'Reference ID is required'),
  notes: z.string().trim().optional(),
});

export const createRefundOutputSchema = z.object({
  success: z.literal(true),
  paymentId: z.string(),
  message: z.string(),
});