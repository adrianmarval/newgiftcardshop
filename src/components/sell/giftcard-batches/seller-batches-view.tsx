'use client';

import type { PaginationMeta, SellerBatch } from '@/types';
import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import { UrlPagination } from '@/components/ui/url-pagination';
import { StatusLegend } from '@/components/common';

export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
}

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <StatusLegend language="en" />
      <BatchesFilters />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <BatchesList batches={batches} totalPages={pagination?.totalPages} />
      </div>
      <div className="shrink-0">
        <UrlPagination totalPages={pagination?.totalPages ?? 1} />
      </div>
    </div>
  );
}
