// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Admin Users
// Server-side parsers for admin user list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { Role } from '@/generated/prisma/enums';

export const adminUsersSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  search: parseAsString.withDefault(''),
  role: parseAsStringLiteral(['ALL', 'ADMIN', 'SELLER', 'BUYER'] as const).withDefault('ALL'),
} as const;

export type AdminUsersSearchParams = {
  page: number;
  limit: number;
  search: string;
  role: 'ALL' | (typeof Role)[keyof typeof Role];
};
