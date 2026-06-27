// ─────────────────────────────────────────────────────────────────────────────
// Search Params — Admin Logs
// Server-side parsers for admin log list URL search params.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const adminLogsSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  level: parseAsStringLiteral(['ALL', 'info', 'warn', 'error', 'debug'] as const).withDefault('ALL'),
  source: parseAsStringLiteral(['ALL', 'web', 'seller-bot', 'buyer-bot', 'cron', 'system'] as const).withDefault('ALL'),
  flow: parseAsStringLiteral(['ALL', 'sell', 'buy', 'order', 'payment', 'batch', 'auth'] as const).withDefault('ALL'),
  search: parseAsString.withDefault(''),
  userId: parseAsString.withDefault(''),
  dateFrom: parseAsString.withDefault(''),
  dateTo: parseAsString.withDefault(''),
} as const;

export type AdminLogsSearchParams = {
  page: number;
  limit: number;
  level: 'ALL' | 'info' | 'warn' | 'error' | 'debug';
  source: 'ALL' | 'web' | 'seller-bot' | 'buyer-bot' | 'cron' | 'system';
  flow: 'ALL' | 'sell' | 'buy' | 'order' | 'payment' | 'batch' | 'auth';
  search: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
};
