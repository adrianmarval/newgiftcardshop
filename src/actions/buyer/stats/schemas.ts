// ─────────────────────────────────────────────────────────────────────────────
// Buyer / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const buyerStatsOutputSchema = z.object({
  orderBook: z.object({
    totalOrdersToday: z.number(),
    totalTradedToday: z.number(),
    entries: z.array(
      z.object({
        orderId: z.string(),
        buyerEmail: z.string(),
        cardCount: z.number(),
        total: z.number(),
        status: z.string(),
        createdAt: z.string(),
      }),
    ),
  }),
  personal: z.object({
    creditLimit: z.number(),
    unpaidFaceValue: z.number(),
    unpaidUsdt: z.number(),
    availableCredit: z.number(),
    pendingOrdersCount: z.number(),
    totalSaved: z.number(),
    monthSpend: z.number(),
    monthOrdersCount: z.number(),
    reportedIssues: z.number(),
  }),
});

export const liveAvailabilityItemSchema = z.object({
  brandCountryId: z.string(),
  brandId: z.string(),
  countryId: z.string(),
  brandName: z.string(),
  brandIcon: z.string(),
  brandImage: z.string().nullable(),
  countryName: z.string(),
  countryCode: z.string(),
  currency: z.string(),
  totalCount: z.number(),
  totalAmount: z.number(),
  accessibleCount: z.number(),
  accessibleAmount: z.number(),
  buyRate: z.number(),
});

export const liveAvailabilityOutputSchema = z.object({
  items: z.array(liveAvailabilityItemSchema),
});