// ─────────────────────────────────────────────────────────────────────────────
// Admin / Logs — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { paginatedOutputSchema } from '@/types';

export const listLogsInputSchema = z.object({
  level: z.enum(['ALL', 'info', 'warn', 'error', 'debug']).optional().default('ALL'),
  source: z.enum(['ALL', 'web', 'seller-bot', 'buyer-bot', 'cron', 'system']).optional().default('ALL'),
  flow: z.enum(['ALL', 'sell', 'buy', 'order', 'payment', 'batch', 'auth']).optional().default('ALL'),
  search: z.string().optional().default(''),
  userId: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const listLogsOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      level: z.string(),
      source: z.string(),
      flow: z.string().nullable(),
      action: z.string().nullable(),
      message: z.string(),
      userId: z.string().nullable(),
      userName: z.string().nullable(),
      metadata: z.unknown().nullable(),
      error: z.unknown().nullable(),
      ip: z.string().nullable(),
    }),
  ),
);

export const purgeLogsInputSchema = z.object({
  olderThanDays: z.number().int().min(0).optional().default(30),
});

export const purgeLogsOutputSchema = z.object({
  success: z.literal(true),
  deletedCount: z.number(),
});

export const getLogUsersOutputSchema = z.object({
  success: z.literal(true),
  users: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});