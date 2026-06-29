// ─────────────────────────────────────────────────────────────────────────────
// Pagination — Pagination types and Zod helpers
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function paginatedOutputSchema<T>(itemsSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    items: itemsSchema,
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
    }),
  });
}