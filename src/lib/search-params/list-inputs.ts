// ─────────────────────────────────────────────────────────────────────────────
// List inputs — builders puros searchParams → input de server action.
// COMPARTIDOS entre el server page (primer paint) y el view client (queryKey
// de useListQuery): misma URL → mismo input → el initialData aplica exacto.
// ─────────────────────────────────────────────────────────────────────────────

import type { inferParserType } from 'nuqs';
import type {
  adminBatchesSearchParamsParsers,
  adminIssuesSearchParamsParsers,
  adminLogsSearchParamsParsers,
  adminOrdersSearchParamsParsers,
  adminPaymentsSearchParamsParsers,
  adminUsersSearchParamsParsers,
  orderSearchParamsParsers,
  sellerBatchesSearchParamsParsers,
} from './parsers';

type AdminOrdersParams = inferParserType<typeof adminOrdersSearchParamsParsers>;
type AdminBatchesParams = inferParserType<typeof adminBatchesSearchParamsParsers>;
type AdminIssuesParams = inferParserType<typeof adminIssuesSearchParamsParsers>;
type AdminUsersParams = inferParserType<typeof adminUsersSearchParamsParsers>;
type AdminPaymentsParams = inferParserType<typeof adminPaymentsSearchParamsParsers>;
type AdminLogsParams = inferParserType<typeof adminLogsSearchParamsParsers>;
type SellerBatchesParams = inferParserType<typeof sellerBatchesSearchParamsParsers>;
type BuyerOrdersParams = inferParserType<typeof orderSearchParamsParsers>;

export function buildAdminOrdersInput(p: AdminOrdersParams) {
  return {
    page: p.page,
    limit: p.limit,
    search: p.search || undefined,
    status: p.status === 'ALL' ? undefined : p.status,
    buyerId: p.buyerId || null,
    dateFrom: p.dateFrom || null,
    dateTo: p.dateTo || null,
  };
}

export function buildAdminBatchesInput(p: AdminBatchesParams) {
  return {
    page: p.page,
    limit: p.limit,
    sort: p.sort,
    status: p.status,
    search: p.search || undefined,
    sellerId: p.sellerId || null,
    dateFrom: p.dateFrom || null,
    dateTo: p.dateTo || null,
    amountMin: p.amountMin ? Number(p.amountMin) : null,
    amountMax: p.amountMax ? Number(p.amountMax) : null,
  };
}

export function buildAdminIssuesInput(p: AdminIssuesParams) {
  return {
    page: p.page,
    limit: p.limit,
    sort: p.sort,
    issueType: p.issueType,
    search: p.search || undefined,
    sellerId: p.sellerId || null,
    buyerId: p.buyerId && p.buyerId !== 'ALL' ? p.buyerId : null,
    dateFrom: p.dateFrom || null,
    dateTo: p.dateTo || null,
  };
}

export function buildAdminUsersInput(p: AdminUsersParams) {
  return {
    page: p.page,
    limit: p.limit,
    search: p.search || undefined,
    role: p.role === 'ALL' ? undefined : p.role,
    isActive: p.isActive === 'ALL' ? undefined : p.isActive === 'true',
  };
}

export function buildAdminPaymentsInput(p: AdminPaymentsParams) {
  return {
    page: p.page,
    limit: p.limit,
    direction: p.direction === 'ALL' ? undefined : p.direction,
    category: p.category === 'ALL' ? undefined : p.category,
    userId: p.userId || null,
    search: p.search || undefined,
    dateFrom: p.dateFrom || null,
    dateTo: p.dateTo || null,
  };
}

export function buildAdminLogsInput(p: AdminLogsParams) {
  return {
    page: p.page,
    limit: p.limit,
    search: p.search || undefined,
    level: p.level === 'ALL' ? undefined : p.level,
    source: p.source === 'ALL' ? undefined : p.source,
    flow: p.flow === 'ALL' ? undefined : p.flow,
    userId: p.userId || null,
    dateFrom: p.dateFrom || null,
    dateTo: p.dateTo || null,
  };
}

export function buildSellerBatchesInput(p: SellerBatchesParams) {
  return {
    page: p.page,
    status: p.status,
    search: p.search || undefined,
    sort: p.sort,
  };
}

export function buildBuyerOrdersInput(p: BuyerOrdersParams) {
  return {
    page: p.page,
    status: p.status === 'ALL' ? undefined : p.status,
    search: p.search || undefined,
    sort: p.sort,
  };
}
