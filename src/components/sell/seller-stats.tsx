'use client';

import { Package, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { SellerStatsProps } from './types';

export function SellerStats({ batches }: SellerStatsProps) {
  const totalBatches = batches.length;
  const totalCardsCount = batches.reduce((acc, b) => acc + b.giftcards.length, 0);
  const totalVolume = batches.reduce((acc, b) => acc + b.giftcards.reduce((sum, g) => sum + g.amount, 0), 0);

  const totalPaid = batches.reduce((acc, b) => {
    const paymentTotal = b.payments.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal > 0) return acc + paymentTotal;
    if (b.isPaid) return acc + b.estimatedPayout;
    return acc;
  }, 0);

  const awaitingPayoutCount = batches.filter((b) => {
    const allConfirmed = b.giftcards.every((g) => g.isConfirmed);
    const notPaid = !b.isPaid && !b.payments.some((p) => p.status === 'COMPLETED');
    return allConfirmed && notPaid && b.giftcards.length > 0;
  }).length;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
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
        label="Earned"
        value={`$${totalPaid.toFixed(0)}`}
        description="Paid"
        icon={<CreditCard className="h-4 w-4 text-emerald-500" />}
        color="text-emerald-500"
      />
      <StatCard
        label="Volume"
        value={`$${totalVolume.toFixed(0)}`}
        description="Total"
        icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
        color="text-amber-500"
      />
    </div>
  );
}
