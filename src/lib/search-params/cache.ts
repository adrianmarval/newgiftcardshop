import { createSearchParamsCache } from 'nuqs/server';
import {
  orderSearchParamsParsers,
  adminBatchesSearchParamsParsers,
  adminOrdersSearchParamsParsers,
  adminUsersSearchParamsParsers,
  adminPaymentsSearchParamsParsers,
  sellerBatchesSearchParamsParsers,
} from './index';

export const orderSearchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
export const adminBatchesSearchParamsCache = createSearchParamsCache(adminBatchesSearchParamsParsers);
export const adminOrdersSearchParamsCache = createSearchParamsCache(adminOrdersSearchParamsParsers);
export const adminUsersSearchParamsCache = createSearchParamsCache(adminUsersSearchParamsParsers);
export const adminPaymentsSearchParamsCache = createSearchParamsCache(adminPaymentsSearchParamsParsers);
export const sellerBatchesSearchParamsCache = createSearchParamsCache(sellerBatchesSearchParamsParsers);
