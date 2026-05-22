// ─────────────────────────────────────────────────────────────────────────────
// Application — Shared types (Pagination, AppSection)
// Single source of truth for application-wide types.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { Role } from '@/generated/prisma/enums';

// ── App Section ───────────────────────────────────────────────────────────────

export type AppSection = 'admin' | 'buy' | 'sell';

export const portalSchema = z.enum(['sell', 'buy', 'admin']);

export const roleMap: Record<AppSection, Role> = {
  admin: 'ADMIN',
  buy: 'BUYER',
  sell: 'SELLER',
};

export const dashboardMap: Record<AppSection, string> = {
  admin: '/admin/dashboard',
  buy: '/store/dashboard',
  sell: '/sell/dashboard',
};

export const APP_SECTION_LABELS: Record<AppSection, string> = {
  admin: 'Portal Admin',
  buy: 'Portal Comprador',
  sell: 'Portal Vendedor',
};

export const appSectionMap: Record<AppSection, string> = {
  admin: '/admin',
  buy: '/store',
  sell: '/sell',
};

// ── Pagination ────────────────────────────────────────────────────────────────

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
