// ─────────────────────────────────────────────────────────────────────────────
// Admin — Batch entity for admin dashboard
// Versión extendida con info de seller, buyer, orders e issues.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardIssueSchema } from '@/types/domain/giftcard/GiftcardIssue';
import { paymentSchema } from '@/types/domain/payment/Payment';

const cardWithBuyerSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.enum(['UNUSED', 'USED', 'ALREADY_USED', 'INVALID', 'DEACTIVATED', 'WRONG_AMOUNT']),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable().optional(),
  orderId: z.string().nullable(),
  brand: z.object({
    name: z.string(),
    icon: z.string(),
    image: z.string().nullable(),
  }),
  country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable(),
  buyer: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
  order: z
    .object({
      id: z.string(),
      status: z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']),
    })
    .nullable(),
  issues: z.array(giftcardIssueSchema).nullable(),
  isSearchMatch: z.boolean().optional(),
});

export const adminBatchSchema = z.object({
  id: z.number(),
  sellRate: z.number(),
  isPaid: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  seller: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    sellRate: z.number(),
    orderCount: z.number(),
    createdAt: z.string(),
    twoFactorEnabled: z.boolean(),
  }),
  giftcards: z.array(cardWithBuyerSchema),
  payments: z.array(paymentSchema),
  effectiveTotal: z.number(),
  estimatedPayout: z.number(),
  cardsCount: z.number(),
  confirmedCount: z.number(),
  paidCount: z.number(),
  hasIssues: z.boolean(),
  currency: z.string().optional(),
});

export type AdminBatch = z.infer<typeof adminBatchSchema>;

export const adminBatchesOutputSchema = z.object({
  success: z.literal(true),
  items: z.array(adminBatchSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
  }),
});

export type AdminBatchesOutput = z.infer<typeof adminBatchesOutputSchema>;
