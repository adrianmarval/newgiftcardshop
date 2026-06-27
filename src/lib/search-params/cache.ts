import { createSearchParamsCache } from 'nuqs/server';
import {
  orderSearchParamsParsers,
  adminBatchesSearchParamsParsers,
  adminOrdersSearchParamsParsers,
  adminUsersSearchParamsParsers,
  adminPaymentsSearchParamsParsers,
  adminLogsSearchParamsParsers,
  sellerBatchesSearchParamsParsers,
} from './index';

export const orderSearchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
export const adminBatchesSearchParamsCache = createSearchParamsCache(adminBatchesSearchParamsParsers);
export const adminOrdersSearchParamsCache = createSearchParamsCache(adminOrdersSearchParamsParsers);
export const adminUsersSearchParamsCache = createSearchParamsCache(adminUsersSearchParamsParsers);
export const adminPaymentsSearchParamsCache = createSearchParamsCache(adminPaymentsSearchParamsParsers);
export const adminLogsSearchParamsCache = createSearchParamsCache(adminLogsSearchParamsParsers);
export const sellerBatchesSearchParamsCache = createSearchParamsCache(sellerBatchesSearchParamsParsers);
