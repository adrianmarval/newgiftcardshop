// ─────────────────────────────────────────────────────────────────────────────
// Admin / Stats — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export const getProfitStatsOutputSchema = z.object({
  summary: z.object({
    today: z.number(),
    week: z.number(),
    month: z.number(),
    todayVolume: z.number(),
  }),
  chartData: z.array(z.object({ date: z.string(), profit: z.number() })),
});

export const getInventoryStatsOutputSchema = z.array(z.object({ range: z.string(), count: z.number(), total: z.number() }));