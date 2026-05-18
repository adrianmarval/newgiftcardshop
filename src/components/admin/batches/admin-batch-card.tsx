'use client';

import { useState, MouseEvent } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { RegistryCard } from '@/components/ui/registry-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { showAlert } from '@/lib/swal';
import { adminBatchDelete } from '@/actions/admin/admin-batch-delete';
import { AdminBatchDetails } from './admin-batch-details';
import type { AdminBatch } from '@/types/domain/admin';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/date-formatter';
import { formatCurrency } from '@/lib/currency-formatter';
import { useLongPress } from '@/hooks/use-long-press';
import { motion } from 'framer-motion';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const canPay = !batch.isPaid && batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0;
  const canDelete = batch.giftcards.every((c) => !c.orderId);
  const currency = batch.giftcards[0]?.country?.currency || 'USD';
  const faceValueCurrency = currency;
  const payoutCurrency = 'USD';

  const getActiveBg = (): string => {
    if (batch.isPaid) return 'bg-emerald-500/10 dark:bg-emerald-500/15';
    if (batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0) return 'bg-blue-500/10 dark:bg-blue-500/15';
    return 'bg-amber-500/10 dark:bg-amber-500/15';
  };

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('Eliminar lote', `¿Eliminar lote #${batch.id}?`);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const result = await adminBatchDelete({ batchId: batch.id });
      if (result.serverError) {
        showAlert.error('Error', result.serverError);
      } else {
        showAlert.toast.success('Lote eliminado');
        onDeleted();
      }
    } catch (error) {
      showAlert.error('Error', 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RegistryCard
      id={batch.id}
      title={
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">Lote #{batch.id}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(batch.id.toString());
              showAlert.toast.success('ID copiado');
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      }
      subtitle={
        <motion.button
          {...useLongPress({
            onLongPress: (e) => {
              e.stopPropagation();
              onViewSeller?.(batch);
            },
            onClick: (e) => {
              e.stopPropagation();
            },
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
        <>
          <span className="text-md text-foreground font-semibold md:text-lg">{formatCurrency(batch.effectiveTotal, { currency: faceValueCurrency })}</span>
          <span className="text-muted-foreground text-xs md:text-sm">
            A Pagar: {formatCurrency(batch.estimatedPayout, { currency: payoutCurrency })}
          </span>
        </>
      }
      date={
        <div className="flex items-center gap-4">
          <span>{formatDateTime(batch.createdAt, 'es-AR')}</span>
          {canDelete && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      }
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={onToggle}
      hasReport={batch.hasIssues}
      activeBgClass={getActiveBg()}
      progress={{
        percentage: (batch.confirmedCount / (batch.cardsCount || 1)) * 100,
        colorClass: 'bg-blue-500',
        fullColorClass: batch.isPaid ? 'bg-emerald-500' : batch.confirmedCount === batch.cardsCount ? 'bg-blue-500' : 'bg-amber-500',
      }}
    >
      <AdminBatchDetails batch={batch} onDeleted={onDeleted} />
    </RegistryCard>
  );
}
