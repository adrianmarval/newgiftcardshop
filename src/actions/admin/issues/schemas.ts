// ─────────────────────────────────────────────────────────────────────────────
// Admin / Issues — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardIssueType, GiftcardStatus, OrderStatus } from '@/generated/prisma/enums';
import { brandSchema, countrySchema, paginatedOutputSchema, adminBuyerSummarySchema, adminSellerSummarySchema } from '@/types';

export const adminIssueGiftcardSchema = z.object({
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
});

export const adminIssueItemSchema = z.object({
  id: z.string(),
  issueType: z.enum(GiftcardIssueType),
  reportedAmount: z.number().nullable(),
  hasProof: z.boolean(),
  createdAt: z.string(),
  giftcard: adminIssueGiftcardSchema,
  order: z.object({
    id: z.string(),
    status: z.enum(OrderStatus),
    total: z.number(),
  }),
  buyer: adminBuyerSummarySchema,
  seller: adminSellerSummarySchema.nullable(),
  isSearchMatch: z.boolean().optional(),
});

export const listIssuesInputSchema = z.object({
  issueType: z.enum(['ALL', 'INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'] as const).optional().default('ALL'),
  sellerId: z.string().nullable().optional(),
  buyerId: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  sort: z.enum(['newest', 'oldest'] as const).optional().default('newest'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const listIssuesOutputSchema = paginatedOutputSchema(z.array(adminIssueItemSchema));

export const getIssueProofInputSchema = z.object({ issueId: z.string() });

export const getIssueProofOutputSchema = z.object({
  success: z.literal(true),
  proof: z.object({ mimeType: z.string(), base64: z.string() }).nullable(),
});
