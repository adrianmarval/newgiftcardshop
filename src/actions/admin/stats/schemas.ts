// ─────────────────────────────────────────────────────────────────────────────
// Admin / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const profitChartPointSchema = z.object({ date: z.string(), profit: z.number() });

export const getProfitStatsOutputSchema = z.object({
  summary: z.object({
    today: z.number(),
    week: z.number(),
    month: z.number(),
    todayVolume: z.number(),
  }),
  charts: z.object({
    daily: z.array(profitChartPointSchema),
    monthly: z.array(profitChartPointSchema),
    yearly: z.array(profitChartPointSchema),
  }),
});

export const getInventoryStatsOutputSchema = z.array(z.object({ range: z.string(), count: z.number(), total: z.number() }));