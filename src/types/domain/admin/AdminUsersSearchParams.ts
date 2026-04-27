import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

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
  role: 'ALL' | 'ADMIN' | 'SELLER' | 'BUYER';
};

export type AdminUsersSearchParamsKeys = keyof typeof adminUsersSearchParamsParsers;
