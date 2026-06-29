// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Giftcards — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { GiftcardStatus } from '@/generated/prisma/enums';

export const searchGiftcardsInputSchema = z.object({
  brandId: z.string(),
  countryId: z.string(),
  amount: z.number(),
});

export const searchGiftcardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z.array(
    z.object({
      id: z.string(),
      brand: z.string(),
      amount: z.number(),
      status: z.literal('UNUSED'),
      country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable().optional(),
      escalationTier: z.number().optional(),
    }),
  ),
  error: z.string().optional(),
  tierInfo: z
    .object({
      buyerBuyRate: z.number(),
      accessibleAmount: z.string(),
      inaccessibleAmount: z.string(),
      totalCards: z.number(),
      accessibleCardCount: z.number(),
      inaccessibleCardCount: z.number(),
      nextCardTier: z.number().optional(),
      estimatedMinutes: z.number().optional(),
    })
    .optional(),
});

export const getOrderCardsInputSchema = z.object({ orderId: z.string() });

export const getOrderCardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z
    .object({
      id: z.string(),
      brand: z.string(),
      amount: z.number(),
      claimCode: z.string(),
      pinCode: z.string().optional(),
      status: z.enum(GiftcardStatus),
      reportedAmount: z.number().optional(),
      country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable().optional(),
    })
    .array(),
});