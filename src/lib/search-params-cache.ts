// ─────────────────────────────────────────────────────────────────────────────
// Search Params Cache — nuqs v2 server-side parsing
// ─────────────────────────────────────────────────────────────────────────────

import { createSearchParamsCache } from 'nuqs/server';
import { orderSearchParamsParsers } from '@/types/domain/order';

export const orderSearchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
