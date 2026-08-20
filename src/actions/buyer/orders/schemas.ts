// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Orders — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardStatus, OrderStatus } from '@/generated/prisma/enums';
import { brandSchema, countrySchema, paymentListItemSchema, paginatedOutputSchema } from '@/types';

export const orderListItemSchema = z.object({
  id: z.string(),
  status: z.enum(OrderStatus),
  total: z.number(),
  adjustedTotal: z.number().nullable(),
  buyRate: z.number(),
  effectiveTotal: z.number(),
  faceValueTotal: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  giftcards: z.array(
    z.object({
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
    }),
  ),
  payments: z.array(paymentListItemSchema),
});

export const listOrdersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(OrderStatus).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export const listOrdersOutputSchema = paginatedOutputSchema(z.array(orderListItemSchema));

export const getOrderByIdInputSchema = z.object({ orderId: z.string() });

export const getOrderByIdOutputSchema = z.object({
  success: z.literal(true),
  order: orderListItemSchema.extend({
    brandCountryId: z.string().optional(),
  }),
});

export const createOrderInputSchema = z.object({
  giftcardIds: z.array(z.string()),
  idempotencyKey: z.string().uuid().optional(),
});

export const createOrderOutputSchema = z.object({
  success: z.literal(true),
  orderId: z.string(),
});

export const completeOrderInputSchema = z.object({
  orderId: z.string().min(1),
  _transactionId: z.string().trim().min(1, 'Transaction ID is required'),
});

export const completeOrderOutputSchema = z.object({
  success: z.literal(true),
  orderId: z.string(),
  message: z.string(),
});

export const cancelOrderInputSchema = z.object({ orderId: z.string() });

export const cancelOrderOutputSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const confirmUsageInputSchema = z.object({ orderId: z.string() });

export const confirmUsageOutputSchema = z.object({
  success: z.literal(true),
  adjustedTotal: z.number(),
});

export const getUserBuyRateInputSchema = z.object({
  brandCountryId: z.string().optional(),
  brandId: z.string().optional(),
  countryId: z.string().optional(),
});

export const getUserBuyRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

export const recentOrdersOutputSchema = z
  .object({
    id: z.string(),
    status: z.enum(OrderStatus),
    total: z.number(),
    adjustedTotal: z.number().nullable(),
    createdAt: z.string(),
    cardsCount: z.number(),
    faceValueTotal: z.number(),
    effectiveTotal: z.number(),
    giftcards: z.array(
      z.object({
        id: z.string(),
        amount: z.number(),
        brand: z.object({ name: z.string(), icon: z.string(), image: z.string().nullable() }),
      }),
    ),
  })
  .array();