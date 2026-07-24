'use client';

import { motion } from 'framer-motion';
import { RegistryCard, useDeleteBatchAction, useCancelBatchAction, useCardCurrency, getBatchProgressConfig, getBatchActiveBg, CopyableId, DeleteIcon, BatchTopRight } from '@/components/common';
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
  const { cancel, isCancelling } = useCancelBatchAction();
  const isCancelled = Boolean(batch.cancelledAt);
  const canPay = !batch.isPaid && !isCancelled && batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0 && batch.estimatedPayout > 0;
  const canDelete = !isCancelled && batch.giftcards.every((c) => !c.orderId);
  const canCancel = !batch.isPaid && !isCancelled && batch.giftcards.length > 0;
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
          {canCancel && (
            <button
              onClick={(e) => cancel(batch.id, e)}
              disabled={isCancelling}
              className="text-destructive/70 hover:text-destructive transition-colors disabled:opacity-50"
              title="Cancelar lote"
            >
              {isCancelling ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
            </button>
          )}
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