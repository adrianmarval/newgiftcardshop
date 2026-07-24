// ─────────────────────────────────────────────────────────────────────────────
// Admin / Batches — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { brandSchema, countrySchema, paymentDetailListItemSchema, paginatedOutputSchema } from '@/types';

export const adminBatchGiftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable(),
  orderId: z.string().nullable(),
  brand: brandSchema,
  country: countrySchema.nullable(),
  buyer: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable(),
  order: z.object({ id: z.string(), status: z.string() }).nullable(),
  issues: z.array(
    z.object({
      id: z.string(),
      issueType: z.string(),
      reportedAmount: z.number().nullable(),
      proofImageUrl: z.string().nullable(),
      giftcardId: z.string(),
      orderId: z.string(),
      reportedById: z.string(),
      sellerId: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  isSearchMatch: z.boolean().optional(),
});

export const adminBatchSellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  sellRate: z.number(),
  orderCount: z.number(),
  createdAt: z.string(),
  twoFactorEnabled: z.boolean(),
});

export const adminBatchListInputSchema = z.object({
  sellerId: z.string().nullable().optional(),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'CANCELLED', 'WITH_ISSUES'] as const).optional().default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  amountMin: z.number().nullable().optional(),
  amountMax: z.number().nullable().optional(),
  search: z.string().optional().default(''),
  sort: z.enum(['newest', 'oldest', 'amount_high', 'amount_low']).optional().default('newest'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

export const adminBatchListOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.number(),
      sellRate: z.number(),
      isPaid: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string().optional(),
      seller: adminBatchSellerSchema,
      giftcards: z.array(adminBatchGiftcardSchema),
      payments: z.array(paymentDetailListItemSchema),
      effectiveTotal: z.number(),
      estimatedPayout: z.number(),
      cardsCount: z.number(),
      confirmedCount: z.number(),
      paidCount: z.number(),
      hasIssues: z.boolean(),
      currency: z.string(),
    }),
  ),
);

export const payBatchInputSchema = z.object({ batchIds: z.array(z.number().int().positive()) });

export const payBatchOutputSchema = z.object({
  success: z.literal(true),
  results: z.array(z.object({ batchId: z.number(), paymentId: z.string(), amount: z.number() })),
  errors: z.array(z.object({ batchId: z.number(), error: z.string() })).optional(),
});

export const deleteCardInputSchema = z.object({ cardId: z.string() });
export const deleteCardOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const deleteBatchInputSchema = z.object({ batchId: z.number().int().positive() });
export const deleteBatchOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const getBatchImagesInputSchema = z.object({ batchId: z.string() });

export const getBatchImagesOutputSchema = z.object({
  success: z.literal(true),
  images: z.array(
    z.object({
      id: z.string(),
      mimeType: z.string(),
      base64: z.string(),
      giftcardId: z.string().nullable(),
    }),
  ),
});

export const linkImageToCardInputSchema = z.object({
  imageId: z.string(),
  giftcardId: z.string(),
});

export const linkImageToCardOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const unlinkImageFromCardInputSchema = z.object({ imageId: z.string() });

export const unlinkImageFromCardOutputSchema = z.union([
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export const cancelBatchInputSchema = z.object({
  batchId: z.number().int().positive(),
});

export const cancelBatchOutputSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});