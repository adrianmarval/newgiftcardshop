// ─────────────────────────────────────────────────────────────────────────────
// Admin / Orders — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardStatus, OrderStatus, GiftcardIssueType } from '@/generated/prisma/enums';
import { brandSchema, countrySchema, paymentDetailListItemSchema, paginatedOutputSchema } from '@/types';

export const adminGiftcardListItemSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.enum(GiftcardStatus),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable(),
  orderId: z.string().nullable(),
  batchId: z.number().nullable().optional(),
  brand: brandSchema,
  country: countrySchema.nullable(),
  isSearchMatch: z.boolean().optional(),
  seller: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable(),
});

export const adminOrderBuyerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  buyRate: z.number(),
  orderCount: z.number(),
  createdAt: z.string(),
  twoFactorEnabled: z.boolean(),
});

export const listOrdersInputSchema = z.object({
  buyerId: z.string().nullable().optional(),
  status: z.enum(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).optional().default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const listOrdersOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.string(),
      status: z.enum(OrderStatus),
      total: z.number(),
      adjustedTotal: z.number().nullable(),
      buyRate: z.number(),
      effectiveTotal: z.number(),
      faceValueTotal: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
      giftcards: z.array(adminGiftcardListItemSchema),
      payments: z.array(paymentDetailListItemSchema),
      buyer: adminOrderBuyerSchema,
    }),
  ),
);

export const cancelOrderInputSchema = z.object({ orderId: z.string() });

export const cancelOrderOutputSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const manageReportInputSchema = z.object({
  action: z.enum(['ADD', 'UPDATE', 'DELETE']),
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(GiftcardIssueType).optional(),
  reportedAmount: z.number().optional(),
});

export const manageReportOutputSchema = z.object({ success: z.literal(true) });