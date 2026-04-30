'use client';

import { RegistryCard } from '@/components/ui/registry-card';
import { formatDateTime } from '@/lib/date-formatter';
import { BatchDetails } from './batch-details';
import type { BatchCardProps } from './types';
import { formatCurrency } from '@/lib/currency-formatter';
import Image from 'next/image';

export function BatchCard({ batch, isExpanded, onToggle }: BatchCardProps) {
  const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = batch.giftcards.length;
  const allConfirmed = confirmedCount === totalItems && totalItems > 0;
  const isPaid = batch.isPaid || batch.payments.length > 0;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const batchTotal = batch.effectiveTotal;
  const firstCard = batch.giftcards[0];
  const currency = firstCard?.country?.currency || 'USD';

  const getStatus = (): { label: string; color: string; activeBg: string } => {
    if (isPaid)
      return {
        label: 'PAID',
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      };
    if (allConfirmed)
      return {
        label: 'CONFIRMED',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        activeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      };
    return {
      label: 'PROCESSING',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      activeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    };
  };

  const status = getStatus();

  return (
    <RegistryCard
      id={batch.id}
      title={`Batch #${batch.id}`}
      icon={
        <Image
          src={batch.giftcards[0]?.brand?.image || '/'}
          alt={batch.giftcards[0]?.brand?.name || 'Batch'}
          width={40}
          height={40}
          className={`h-10 w-10 rounded-lg object-contain p-1 ${status.color}`}
          style={{ width: 'auto', height: 'auto' }}
        />
      }
      topRightContent={
        <>
          <span className="text-md text-foreground font-semibold md:text-lg">
            {formatCurrency(batchTotal, { currency })}
          </span>
          <span className="text-muted-foreground text-xs md:text-sm">
            You get: {formatCurrency(batch.estimatedPayout, { currency: 'USD' })}
          </span>
        </>
      }
      date={formatDateTime(batch.createdAt, 'en-US')}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasReport={batch.giftcards.some((g) => g.status === 'WRONG_AMOUNT')}
      activeBgClass={status.activeBg}
      progress={{
        percentage: progressPercentage,
        colorClass: 'bg-blue-500',
        fullColorClass: isPaid ? 'bg-emerald-500' : allConfirmed ? 'bg-blue-500' : 'bg-amber-500',
      }}
    >
      <BatchDetails batch={batch} />
    </RegistryCard>
  );
}
