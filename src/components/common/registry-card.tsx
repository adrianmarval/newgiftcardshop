'use client';

import { ReactNode, MouseEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { GiftcardStatus } from '@/generated/prisma/enums';
import type { OrderStatus } from '@/generated/prisma/enums';
import { showAlert } from '@/lib/ui';
import { orderStatusConfig } from '@/lib/config/ui-config';
import { cancelOrder } from '@/actions/admin/orders';
import { deleteBatch, cancelBatch } from '@/actions/admin/batches';
import Image from 'next/image';
import type { AdminBatch, Giftcard, SellerBatch } from '@/types';

// ── RegistryCard shell ────────────────────────────────────────────────────────

export interface RegistryCardProps {
  id: string | number;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  topRightContent?: ReactNode;
  date?: Date | string | ReactNode;
  isExpanded: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
  hasReport?: boolean;
  progress?: {
    percentage: number;
    colorClass: string;
    fullColorClass?: string;
  };
  activeBgClass?: string;
  statusLabel?: { text: string; colorClass: string };
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function RegistryCard({
  id,
  title,
  subtitle,
  icon,
  topRightContent,
  date,
  isExpanded,
  isHighlighted,
  onToggle,
  hasReport,
  progress,
  activeBgClass,
  statusLabel,
  actions,
  children,
  className = '',
}: RegistryCardProps) {
  return (
    <Card
      id={`registry-card-${id}`}
      onClick={onToggle}
      className={`hover:border-primary/30 relative cursor-pointer scroll-mt-2 gap-0 overflow-hidden border py-1 transition-all duration-200 ease-out ${
        isExpanded || isHighlighted ? `${activeBgClass || 'bg-primary/10 dark:bg-primary/15'} shadow-sm` : ''
      } ${isHighlighted ? 'border-primary/50 ring-primary/20 ring-1' : ''} ${className}`}
    >
      <CardHeader className="px-2">
        <CardTitle className="text-inherit">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1 md:gap-1">
            {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center">{icon}</div>}

            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-md text-foreground min-w-0 font-medium md:text-base">{title}</div>
              {subtitle && <div className="text-muted-foreground truncate text-xs md:text-sm">{subtitle}</div>}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">{topRightContent}</div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          {date && <span className="text-muted-foreground text-sm">{date instanceof Date ? formatDateTime(date, 'es-AR') : date}</span>}
        </div>
        <ChevronDown className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </CardContent>

      {/* Status Label */}
      {statusLabel && (
        <div className="px-2 py-1">
          <span className={`text-[11px] font-semibold tracking-wide uppercase ${statusLabel.colorClass}`}>{statusLabel.text}</span>
        </div>
      )}

      {/* Progress Bar */}
      {progress && (
        <div className="bg-muted flex h-1 overflow-hidden">
          {progress.fullColorClass ? (
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progress.fullColorClass}`} />
          ) : (
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={`h-full ${progress.colorClass}`} />
          )}
        </div>
      )}

      {/* Badge with Reports for closed cards (only if not expanded) */}
      {hasReport && !isExpanded && (
        <div className="text-muted-foreground/80 absolute right-2 bottom-4 z-20 flex items-center justify-center gap-1 text-[10px] font-black tracking-widest uppercase">
          <AlertTriangle className="text-destructive fill-destructive/20 h-4 w-4 drop-shadow-md" />
          <span>With Reports</span>
        </div>
      )}

      {/* Action Slot */}
      {actions && <CardFooter className="p-1">{actions}</CardFooter>}

      {/* Expansion Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-border cursor-default border-t p-1 md:p-4" onClick={(e: MouseEvent) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Shared hooks for cards (orders + batches) ─────────────────────────────────

export function useCardProgress<T extends { giftcards: { isConfirmed: boolean; status: GiftcardStatus }[] }>(item: T) {
  const confirmedCount = item.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = item.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  return { confirmedCount, totalItems, progressPercentage };
}

export function useCardCurrency(giftcards: { country?: { currency: string | null } | null }[]) {
  return giftcards[0]?.country?.currency || 'USD';
}

export function useCopyId(id: string | number, shareText?: string) {
  return (e: MouseEvent) => {
    e.stopPropagation();
    const textToCopy = shareText || String(id);
    navigator.clipboard.writeText(textToCopy);
    showAlert.toast.success(shareText ? 'Copiado para compartir' : 'ID copiado');
  };
}

export function useCancelOrderAction() {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const cancel = async (orderId: string, e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('¿Seguro que quieres cancelar esta orden?', 'Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await cancelOrder({ orderId });
      if (result.serverError || result.validationErrors) {
        showAlert.error('Error al cancelar la orden');
      } else {
        showAlert.toast.success('Orden cancelada con éxito');
        router.refresh();
      }
    } catch {
      showAlert.error('Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };
  return { cancel, isCancelling };
}

export function useDeleteBatchAction() {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = async (batchId: number, onDeleted: () => void, e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('Eliminar lote', `¿Eliminar lote #${batchId}?`);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const result = await deleteBatch({ batchId });
      if (result.serverError) {
        showAlert.error('Error', result.serverError);
      } else {
        showAlert.toast.success('Lote eliminado');
        onDeleted();
      }
    } catch (error) {
      console.error(error);
      showAlert.error('Error', 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };
  return { remove, isDeleting };
}

export function useCancelBatchAction() {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const cancel = async (batchId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm(
      '¿Cancelar lote?',
      'El lote se marcará como cancelado. El seller será notificado. Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await cancelBatch({ batchId });
      if (result.serverError || result.validationErrors) {
        showAlert.error(result.serverError || 'Error al cancelar el lote');
      } else {
        showAlert.toast.success('Lote cancelado con éxito');
        router.refresh();
      }
    } catch {
      showAlert.error('Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };
  return { cancel, isCancelling };
}

// ── Order config helpers ─────────────────────────────────────────────────────

export function getOrderProgressConfig(status: OrderStatus, progressPercentage: number) {
  const colorMap: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-500',
    AWAITING_PAYMENT: 'bg-blue-500',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-destructive',
  };
  return {
    percentage: progressPercentage,
    colorClass: colorMap[status] ?? 'bg-muted',
    fullColorClass: status === 'COMPLETED' ? 'bg-emerald-500' : status === 'CANCELLED' ? 'bg-destructive' : undefined,
  };
}

export function getOrderActiveBg(status: OrderStatus): string {
  return orderStatusConfig[status]?.activeBg ?? 'bg-muted/10 dark:bg-muted/15';
}

export function getOrderHasReports(giftcards: Giftcard[]): boolean {
  return giftcards.some((g) => ['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'].includes(g.status));
}

// ── Batch config helpers ─────────────────────────────────────────────────────

export function getBatchProgressConfig(batch: AdminBatch | SellerBatch) {
  const isPaid = 'isPaid' in batch ? batch.isPaid : false;
  const isCancelled = 'cancelledAt' in batch ? Boolean(batch.cancelledAt) : false;
  const allConfirmed = batch.confirmedCount !== undefined && batch.cardsCount !== undefined && batch.confirmedCount === batch.cardsCount;
  return {
    percentage: ((batch.confirmedCount ?? 0) / (batch.cardsCount || 1)) * 100,
    colorClass: 'bg-blue-500',
    fullColorClass: isCancelled ? 'bg-destructive' : isPaid ? 'bg-emerald-500' : allConfirmed ? 'bg-blue-500' : 'bg-amber-500',
  };
}

export function getBatchActiveBg(batch: AdminBatch | SellerBatch): string {
  const isPaid = batch.isPaid;
  const isCancelled = 'cancelledAt' in batch ? Boolean(batch.cancelledAt) : false;
  const allConfirmed = batch.confirmedCount !== undefined && batch.cardsCount !== undefined && batch.confirmedCount === batch.cardsCount;
  if (isCancelled) return 'bg-destructive/10 dark:bg-destructive/15';
  if (isPaid) return 'bg-emerald-500/10 dark:bg-emerald-500/15';
  if (allConfirmed) return 'bg-blue-500/10 dark:bg-blue-500/15';
  return 'bg-amber-500/10 dark:bg-amber-500/15';
}

export function getBatchStatusLabel(batch: AdminBatch | SellerBatch, lang: 'en' | 'es' = 'es'): { text: string; colorClass: string } {
  const isPaid = 'isPaid' in batch ? batch.isPaid : false;
  const isCancelled = 'cancelledAt' in batch ? Boolean(batch.cancelledAt) : false;
  const allConfirmed = batch.confirmedCount !== undefined && batch.cardsCount !== undefined && batch.confirmedCount === batch.cardsCount;

  if (isCancelled) return { text: lang === 'en' ? 'Cancelled' : 'Cancelado', colorClass: 'text-destructive' };
  if (isPaid) return { text: lang === 'en' ? 'Paid' : 'Pagado', colorClass: 'text-emerald-500' };
  if (allConfirmed) return { text: lang === 'en' ? 'Confirmed' : 'Confirmado', colorClass: 'text-blue-500' };
  return { text: lang === 'en' ? 'Processing' : 'En proceso', colorClass: 'text-amber-500' };
}

export function getOrderStatusLabel(status: OrderStatus, lang: 'en' | 'es' = 'es'): { text: string; colorClass: string } {
  const labels: Record<OrderStatus, string> = {
    PENDING: lang === 'en' ? 'Pending' : 'Pendiente',
    AWAITING_PAYMENT: lang === 'en' ? 'Awaiting Payment' : 'Esperando pago',
    COMPLETED: lang === 'en' ? 'Completed' : 'Completada',
    CANCELLED: lang === 'en' ? 'Cancelled' : 'Cancelada',
  };
  const colors: Record<OrderStatus, string> = {
    PENDING: 'text-amber-500',
    AWAITING_PAYMENT: 'text-blue-500',
    COMPLETED: 'text-emerald-500',
    CANCELLED: 'text-destructive',
  };
  return { text: labels[status] ?? status, colorClass: colors[status] ?? 'text-muted-foreground' };
}

// ── Shared presentational components used by all 4 cards ─────────────────────

export function BrandIcon({
  image,
  name,
  fallbackIcon,
  className,
}: {
  image: string | null | undefined;
  name: string | undefined;
  fallbackIcon?: string;
  className?: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name || 'Card'}
        width={40}
        height={40}
        className={className ?? 'h-10 w-10 rounded-lg object-contain p-1'}
        style={{ width: 'auto', height: 'auto' }}
      />
    );
  }
  return <span className="text-3xl">{fallbackIcon ?? '📦'}</span>;
}

export function CopyableId({ id, prefix = '#', className, shareText }: { id: string | number; prefix?: string; className?: string; shareText?: string }) {
  const handleCopy = useCopyId(id, shareText);
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className ?? ''}`}>
      <span className="truncate">
        {prefix}
        {typeof id === 'string' ? id.slice(-8).toUpperCase() : id}
      </span>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy} title={shareText ? 'Copy full info to share' : 'Copy ID'}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function DeleteIcon({ isDeleting, onClick }: { isDeleting: boolean; onClick: (e: MouseEvent) => void }) {
  return (
    <Button
      onClick={onClick}
      disabled={isDeleting}
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 h-8 w-8"
    >
      {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

export function OrderTopRight({
  faceValueTotal,
  effectiveTotal,
  faceValueCurrency,
  paymentCurrency,
}: {
  faceValueTotal: number;
  effectiveTotal: number;
  faceValueCurrency: string;
  paymentCurrency: string;
}) {
  return (
    <>
      <span className="text-md text-foreground font-semibold md:text-lg">
        {formatCurrency(faceValueTotal, { currency: faceValueCurrency })}
      </span>
      <span className="text-muted-foreground text-xs md:text-sm">
        Precio: {formatCurrency(effectiveTotal, { currency: paymentCurrency })}
      </span>
    </>
  );
}

export function BatchTopRight({
  faceValueTotal,
  estimatedPayout,
  faceValueCurrency,
  payoutCurrency,
}: {
  faceValueTotal: number;
  estimatedPayout: number;
  faceValueCurrency: string;
  payoutCurrency: string;
}) {
  return (
    <>
      <span className="text-md text-foreground font-semibold md:text-lg">
        {formatCurrency(faceValueTotal, { currency: faceValueCurrency })}
      </span>
      <span className="text-muted-foreground text-xs md:text-sm">
        A Pagar: {formatCurrency(estimatedPayout, { currency: payoutCurrency })}
      </span>
    </>
  );
}
