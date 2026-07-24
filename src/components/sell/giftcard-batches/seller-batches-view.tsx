'use client';

import type { PaginationMeta, SellerBatch } from '@/types';
import { BatchesList } from './batches-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { FiltersBar, StatusLegend } from '@/components/common';
import { sellerBatchesSearchParamsParsers } from '@/lib/search-params';

export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
}

const FILTERS_DEFAULTS = {
  status: 'ALL',
  search: '',
  sort: 'newest',
};

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <StatusLegend language="en" />
      <FiltersBar
        parsers={sellerBatchesSearchParamsParsers}
        defaults={FILTERS_DEFAULTS}
        labels={{ filters: 'Filters', clear: 'Clear' }}
        config={{
          search: { placeholder: 'Search by claim code or batch id...', paramKey: 'search' },
          status: {
            label: 'Status',
            paramKey: 'status',
            options: [
              { value: 'ALL', label: 'All' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PAID', label: 'Paid' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'REPORTED', label: 'Reported' },
            ],
          },
          sort: {
            label: 'Sort',
            paramKey: 'sort',
            options: [
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ],
          },
        }}
      />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <BatchesList batches={batches} totalPages={pagination?.totalPages} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination?.totalPages ?? 1} />
      </div>
    </div>
  );
}