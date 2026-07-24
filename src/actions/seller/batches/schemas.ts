// ─────────────────────────────────────────────────────────────────────────────
// Seller / Batches — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { brandSchema, countrySchema, paymentListItemSchema, paginatedOutputSchema } from '@/types';

export const sellerBatchGiftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.enum(GiftcardStatus),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable().optional(),
  orderId: z.string().nullable(),
  batchId: z.number().nullable().optional(),
  provenanceImageId: z.string().nullable().optional(),
  brand: brandSchema,
  country: countrySchema.nullable(),
  isSearchMatch: z.boolean().optional(),
});

export const publishBatchInputSchema = z.object({
  cards: z.array(
    z.object({
      amount: z.string().trim().min(1),
      claimCode: z.string().trim().min(1),
      pinCode: z.string().trim().optional(),
      compressedImageData: z.string().optional(),
    }),
  ),
  brandId: z.string().min(1),
  countryId: z.string().min(1),
  unmatchedImages: z.array(z.object({ data: z.string() })).optional(),
});

export const publishBatchOutputSchema = z.object({
  success: z.literal(true),
  batchId: z.number(),
  duplicates: z.array(z.string()),
});

export const listBatchesInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'CANCELLED', 'REPORTED'] as const).optional().default('ALL'),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export const listBatchesOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.number(),
      userId: z.string().nullable(),
      sellRate: z.number(),
      isPaid: z.boolean(),
      createdAt: z.string(),
      giftcards: z.array(sellerBatchGiftcardSchema),
      payments: z.array(paymentListItemSchema),
      effectiveTotal: z.number(),
      estimatedPayout: z.number(),
      cardsCount: z.number().optional(),
      confirmedCount: z.number().optional(),
      paidCount: z.number().optional(),
      hasIssues: z.boolean().optional(),
    }),
  ),
);

export const recentBatchesOutputSchema = z
  .object({
    id: z.number(),
    sellRate: z.number(),
    isPaid: z.boolean(),
    createdAt: z.string(),
    giftcards: z.array(
      z.object({
        id: z.string(),
        amount: z.number(),
        brand: z.object({ name: z.string(), icon: z.string(), image: z.string().nullable() }),
      }),
    ),
    cardsCount: z.number(),
    effectiveTotal: z.number(),
  })
  .array();

export const checkCodesInputSchema = z.object({
  codes: z.array(z.string()),
  brandId: z.string(),
  countryId: z.string(),
});

export const checkCodesOutputSchema = z.object({
  success: z.literal(true),
  existingCodes: z.array(z.string()),
});