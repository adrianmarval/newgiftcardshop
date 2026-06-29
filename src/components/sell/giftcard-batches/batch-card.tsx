'use client';

import { RegistryCard, useCardProgress, useCardCurrency, getBatchProgressConfig, CopyableId, BrandIcon, BatchTopRight } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import { BatchDetails } from './batch-details';
import type { SellerBatch } from '@/types';

export interface BatchCardProps {
  batch: SellerBatch;
  isExpanded: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
}

export function BatchCard({ batch, isExpanded, isHighlighted, onToggle }: BatchCardProps) {
  useCardProgress(batch);
  const currency = useCardCurrency(batch.giftcards);
  const isPaid = batch.isPaid || batch.payments.length > 0;
  const allConfirmed =
    batch.confirmedCount !== undefined &&
    batch.cardsCount !== undefined &&
    batch.confirmedCount === batch.cardsCount;

  // Override getBatchActiveBg to use seller-specific status (PROCESSING/CONFIRMED/PAID)
  const getSellerBg = (): string => {
    if (isPaid) return 'bg-emerald-500/10 dark:bg-emerald-500/15';
    if (allConfirmed) return 'bg-blue-500/10 dark:bg-blue-500/15';
    return 'bg-amber-500/10 dark:bg-amber-500/15';
  };

  return (
    <RegistryCard
      id={batch.id}
      title={<CopyableId id={batch.id} prefix="Batch #" />}
      icon={
        <BrandIcon
          image={batch.giftcards[0]?.brand?.image}
          name={batch.giftcards[0]?.brand?.name}
          className="h-10 w-10 rounded-lg object-contain p-1"
        />
      }
      topRightContent={
        <>
          <span className="text-md text-foreground font-semibold md:text-lg">
            {formatDateTime(batch.createdAt, 'en-US').split(',')[0] ? `$${batch.effectiveTotal.toFixed(2)}` : ''}
          </span>
          <BatchTopRight
            faceValueTotal={batch.effectiveTotal}
            estimatedPayout={batch.estimatedPayout}
            faceValueCurrency={currency}
            payoutCurrency="USD"
          />
        </>
      }
      date={formatDateTime(batch.createdAt, 'en-US')}
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={onToggle}
      hasReport={batch.giftcards.some((g) => g.status === 'WRONG_AMOUNT')}
      activeBgClass={getSellerBg()}
      progress={getBatchProgressConfig(batch)}
    >
      <BatchDetails batch={batch} />
    </RegistryCard>
  );
}