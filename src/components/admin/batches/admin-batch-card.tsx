'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { adminBatchDelete } from '@/actions/admin/admin-batch-delete';
import { AdminBatchDetails } from './admin-batch-details';
import type { AdminBatch } from '@/types/domain/admin';
import { Spinner } from '@/components/ui/spinner';

interface AdminBatchCardProps {
  batch: AdminBatch;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDeleted: () => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PROCESSING: { label: 'EN PROCESO', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  CONFIRMED: { label: 'CONFIRMADO', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  PAID: { label: 'PAGADO', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  WITH_ISSUES: { label: 'CON REPORTES', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function AdminBatchCard({ batch, isSelected, onSelect, onDeleted, isExpanded, onToggle }: AdminBatchCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const canPay = !batch.isPaid && batch.confirmedCount === batch.cardsCount && batch.cardsCount > 0;
  const canDelete = batch.giftcards.every((c) => !c.orderId);

  const status = statusConfig[batch.isPaid ? 'PAID' : batch.confirmedCount === batch.cardsCount ? 'CONFIRMED' : 'PROCESSING'];
  const statusColor = status.color;

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar lote #${batch.id}? Esta acción no se puede deshacer.`)) return;
    setIsDeleting(true);
    try {
      const result = await adminBatchDelete({ batchId: batch.id });
      if (result.serverError) {
        toast.error('Error', { description: result.serverError });
      } else if (result.data?.error) {
        toast.error('Error', { description: result.data.error });
      } else {
        toast.success('Lote eliminado');
        onDeleted();
      }
    } catch (error) {
      toast.error('Error', { description: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      onClick={onToggle}
      className={`relative cursor-pointer overflow-hidden p-1 transition-all duration-200 ${isExpanded ? 'bg-primary/10 dark:bg-primary/15 shadow-md' : ''}`}
    >
     {batch.hasIssues && (
        <div className="absolute bottom-4 right-1 z-20">
          <AlertTriangle className="text-destructive fill-destructive/20 h-4 w-4 drop-shadow-md" />
        </div>
      )}
      <CardHeader className="px-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {canPay && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(!!checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 cursor-pointer"
              />
            )}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-foreground text-md font-medium md:text-sm">Lote #{batch.id}</span>
              </div>
              <span className="text-muted-foreground text-xs md:text-lg">{batch.seller.email}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-foreground text-md font-semibold md:text-lg">${batch.effectiveTotal.toFixed(0)}</span>
            <span className="text-muted-foreground text-xs md:text-sm">A Pagar: ${batch.estimatedPayout.toFixed(2)}</span>
          </div>
        </div>
        {/* <Badge
          className={`${statusColor} absolute -right-2 top-12 z-20 rotate-[-12deg] border-2 border-current bg-background px-3 py-1 text-[10px] font-black tracking-widest uppercase shadow-xl transition-all hover:rotate-[-5deg] hover:scale-110 md:text-xs`}
        >
          {status.label}
        </Badge> */}
      </CardHeader>

      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm md:text-sm">Fecha: {new Date(batch.createdAt).toLocaleDateString()}</span>
          {canDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <ChevronDown
          className={`text-muted-foreground cursor-pointer transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          onClick={onToggle}
        />
      </CardContent>

      <div className="bg-muted flex h-1 overflow-hidden rounded-b-xl">
        {batch.isPaid ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-emerald-500" />
        ) : batch.confirmedCount === batch.cardsCount ? (
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-blue-500" />
        ) : (
          <>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(batch.confirmedCount / batch.cardsCount) * 100}%` }}
              className="h-full bg-blue-500"
            />
            <div className="flex-1 bg-amber-400" />
          </>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-border cursor-default border-t p-4" onClick={(e) => e.stopPropagation()}>
              <AdminBatchDetails batch={batch} onDeleted={onDeleted} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
