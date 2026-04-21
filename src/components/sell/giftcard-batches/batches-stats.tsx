'use client';

import { Package, CheckCircle2, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { BatchesStatsProps } from './types';

export function BatchesStats({ batches }: BatchesStatsProps) {
  const totalBatches = batches.length;
  const totalCardsCount = batches.reduce((acc, b) => acc + b.giftcards.length, 0);
  const inProcessCount = batches.filter((b) => {
    const allConfirmed = b.giftcards.every((g) => g.isConfirmed);
    const notPaid = !b.isPaid && !b.payments.some((p) => p.status === 'COMPLETED');
    return allConfirmed && notPaid && b.giftcards.length > 0;
  }).length;

  const awaitingPayoutCount = batches.filter((b) => {
    const allConfirmed = b.giftcards.every((g) => g.isConfirmed);
    const notPaid = !b.isPaid && !b.payments.some((p) => p.status === 'COMPLETED');
    return allConfirmed && notPaid && b.giftcards.length > 0;
  }).length;

  return (
    <div className="grid grid-cols-3 gap-1 md:grid-cols-4 md:gap-4">
      <StatCard
        label="Batches"
        value={totalBatches}
        description={`${totalCardsCount} cards`}
        icon={<Package className="text-primary h-4 w-4" />}
      />
      <StatCard
        label="Confirmed"
        value={awaitingPayoutCount}
        description="Awaiting payout"
        icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
        color="text-blue-500"
      />
      <StatCard
        label="In Process"
        value={inProcessCount}
        description="Total"
        icon={<Clock className="h-4 w-4 text-amber-500" />}
        color="text-amber-500"
      />
    </div>
  );
}
