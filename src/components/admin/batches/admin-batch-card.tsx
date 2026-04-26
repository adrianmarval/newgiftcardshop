'use client';

import { useState, MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { RegistryCard } from '@/components/ui/registry-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { adminBatchDelete } from '@/actions/admin/admin-batch-delete';
import { AdminBatchDetails } from './admin-batch-details';
import type { AdminBatch } from '@/types/domain/admin';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/date-formatter';

interface AdminBatchCardProps {
  batch: AdminBatch;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDeleted: () => void;
  onViewSeller?: (batch: AdminBatch) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function AdminBatchCard({
  batch,
  isSelected,
  onSelect,
  onDeleted,
  onViewSeller,
  isExpanded = false,
  onToggle = () => {},
}: AdminBatchCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const canPay = !batch.isPaid && batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0;
  const canDelete = batch.giftcards.every((c) => !c.orderId);

  const getActiveBg = (): string => {
    if (batch.isPaid) return 'bg-emerald-500/10 dark:bg-emerald-500/15';
    if (batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0) return 'bg-blue-500/10 dark:bg-blue-500/15';
    return 'bg-amber-500/10 dark:bg-amber-500/15';
  };

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar lote #${batch.id}?`)) return;
    setIsDeleting(true);
    try {
      const result = await adminBatchDelete({ batchId: batch.id });
      if (result.serverError) {
        toast.error('Error', { description: result.serverError });
      } else {
        toast.success('Lote eliminado');
        onDeleted();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RegistryCard
      id={batch.id}
      title={`Lote #${batch.id}`}
      subtitle={
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewSeller?.(batch);
          }}
          className="text-muted-foreground hover:text-primary text-left"
        >
          {batch.seller.email}
        </button>
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
          <span className="text-md text-foreground font-semibold md:text-lg">${batch.effectiveTotal.toFixed(0)}</span>
          <span className="text-muted-foreground text-xs md:text-sm">A Pagar: ${batch.estimatedPayout.toFixed(2)}</span>
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
      onToggle={onToggle}
      hasReport={batch.hasIssues}
      activeBgClass={getActiveBg()}
      progress={{
        percentage: (batch.confirmedCount / (batch.cardsCount || 1)) * 100,
        colorClass: 'bg-blue-500',
        fullColorClass: batch.isPaid ? 'bg-emerald-500' : batch.confirmedCount === batch.cardsCount ? 'bg-blue-500' : undefined,
      }}
    >
      <AdminBatchDetails batch={batch} onDeleted={onDeleted} />
    </RegistryCard>
  );
}
