'use client';

import { motion } from 'framer-motion';
import { RegistryCard, useDeleteBatchAction, useCardCurrency, getBatchProgressConfig, getBatchActiveBg, CopyableId, DeleteIcon, BatchTopRight } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useLongPress } from '@/hooks/use-long-press';
import { AdminBatchDetails } from './admin-batch-details';
import type { AdminBatch } from '@/types';

interface AdminBatchCardProps {
  batch: AdminBatch;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDeleted: () => void;
  onViewSeller?: (batch: AdminBatch) => void;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle?: () => void;
}

export function AdminBatchCard({
  batch,
  isSelected,
  onSelect,
  onDeleted,
  onViewSeller,
  isExpanded = false,
  isHighlighted = false,
  onToggle = () => {},
}: AdminBatchCardProps) {
  const { remove, isDeleting } = useDeleteBatchAction();
  const canPay = !batch.isPaid && batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0;
  const canDelete = batch.giftcards.every((c) => !c.orderId);
  const currency = useCardCurrency(batch.giftcards);

  return (
    <RegistryCard
      id={batch.id}
      title={<CopyableId id={batch.id} prefix="Lote #" />}
      subtitle={
        <motion.button
          {...useLongPress({
            onLongPress: (e) => {
              e.stopPropagation();
              onViewSeller?.(batch);
            },
            onClick: (e) => e.stopPropagation(),
          })}
          whileTap={{ scale: 0.95 }}
          className="text-muted-foreground hover:text-primary relative touch-manipulation text-left transition-colors select-none"
        >
          {batch.seller.email}
          <span className="block text-[10px] leading-none opacity-0 transition-opacity group-hover:opacity-50">
            (Mantén presionado para ver info)
          </span>
        </motion.button>
      }
      icon={
        canPay ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 cursor-pointer"
          />
        ) : undefined
      }
      topRightContent={
        <BatchTopRight
          faceValueTotal={batch.effectiveTotal}
          estimatedPayout={batch.estimatedPayout}
          faceValueCurrency={currency}
          payoutCurrency="USD"
        />
      }
      date={
        <div className="flex items-center gap-1">
          <span>{formatDateTime(batch.createdAt, 'es-AR')}</span>
          {canDelete && <DeleteIcon isDeleting={isDeleting} onClick={(e) => remove(batch.id, onDeleted, e)} />}
        </div>
      }
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={onToggle}
      hasReport={batch.hasIssues}
      activeBgClass={getBatchActiveBg(batch)}
      progress={getBatchProgressConfig(batch)}
    >
      <AdminBatchDetails batch={batch} onDeleted={onDeleted} />
    </RegistryCard>
  );
}