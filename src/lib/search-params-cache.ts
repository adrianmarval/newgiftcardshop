import { createSearchParamsCache } from 'nuqs/server';
import { orderSearchParamsParsers } from '@/types/domain/order';
import {
  adminBatchesSearchParamsParsers,
  adminOrdersSearchParamsParsers,
  adminUsersSearchParamsParsers,
  adminPaymentsSearchParamsParsers,
} from '@/types/domain/admin';
import { sellerBatchesSearchParamsParsers } from '@/types/domain/seller';

export const orderSearchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
export const adminBatchesSearchParamsCache = createSearchParamsCache(adminBatchesSearchParamsParsers);
export const adminOrdersSearchParamsCache = createSearchParamsCache(adminOrdersSearchParamsParsers);
export const adminUsersSearchParamsCache = createSearchParamsCache(adminUsersSearchParamsParsers);
export const adminPaymentsSearchParamsCache = createSearchParamsCache(adminPaymentsSearchParamsParsers);
export const sellerBatchesSearchParamsCache = createSearchParamsCache(sellerBatchesSearchParamsParsers);
