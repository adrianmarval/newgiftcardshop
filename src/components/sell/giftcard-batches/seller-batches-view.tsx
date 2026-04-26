'use client';

import { BatchesFilters } from './batches-filters';
import { BatchesList } from './batches-list';
import type { SellerBatchesViewProps } from './types';
import { StatusLeyend } from '@/components/ui/status-leyend';

export function SellerBatchesView({ batches, pagination }: SellerBatchesViewProps) {
  return (
    <div className="space-y-4">
      <StatusLeyend language="en" />
      <BatchesFilters />
      <BatchesList batches={batches} totalPages={pagination?.totalPages} />
    </div>
  );
}
