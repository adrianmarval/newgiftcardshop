'use client';

import { useRouter } from 'next/navigation';
import { useState, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Copy } from 'lucide-react';
import { useLongPress } from '@/hooks/use-long-press';
import { RegistryCard } from '@/components/ui/registry-card';
import { formatDateTime } from '@/lib/date-formatter';
import { formatCurrency } from '@/lib/currency-formatter';
import { Button } from '@/components/ui/button';
import { showAlert } from '@/lib/swal';
import { AdminOrderDetails } from '@/components/admin/orders/admin-order-details';
import { adminCancelOrder } from '@/actions/admin/admin-order-cancel';
import { Spinner } from '@/components/ui/spinner';
import type { AdminOrderCardProps } from './types';
import type { Giftcard } from '@/types/domain/giftcard';
import Image from 'next/image';

const statusConfig: Record<string, { label: string; color: string; activeBg: string }> = {
  PENDING: {
    label: 'PENDIENTE',
    color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    activeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
  },
  AWAITING_PAYMENT: {
    label: 'ESPERANDO',
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    activeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
  },
  COMPLETED: {
    label: 'COMPLETADA',
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
  CANCELLED: {
    label: 'CANCELADA',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    activeBg: 'bg-destructive/10 dark:bg-destructive/15',
  },
};

export const AdminOrderCard = ({
  order,
  onViewBuyer,
  onAddReport,
  onEditReport,
  onDeleteReport,
  isExpanded = false,
  isHighlighted = false,
  onToggle,
}: AdminOrderCardProps & {
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}) => {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = statusConfig[order.status] || { label: order.status, color: 'bg-muted', activeBg: 'bg-muted/10 dark:bg-muted/15' };
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const hasReports = order.giftcards.some((g) => ['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT'].includes(g.status));
  const currency = order.giftcards[0]?.country?.currency || 'USD';

  const handleCancelOrder = async (e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('¿Seguro que quieres cancelar esta orden?', 'Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await adminCancelOrder({ orderId: order.id });
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

  return (
    <RegistryCard
      id={order.id}
      title={
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">Orden #{order.id.slice(-8).toUpperCase()}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(order.id);
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
              onViewBuyer?.(order);
            },
            onClick: (e) => {
              e.stopPropagation();
              // No hacemos nada en click simple
            },
          })}
          whileTap={{ scale: 0.95 }}
          className="text-muted-foreground hover:text-primary relative touch-manipulation text-left text-xs transition-colors select-none md:text-sm"
        >
          {order.buyer.email}
          <span className="block text-[10px] leading-none opacity-0 transition-opacity group-hover:opacity-50">
            (Mantén presionado para ver info)
          </span>
        </motion.button>
      }
      icon={
        order.giftcards?.[0]?.brand?.image ? (
          <Image
            src={order.giftcards?.[0]?.brand?.image || '/'}
            alt={order.giftcards?.[0]?.brand?.name || 'Order'}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain p-1"
            style={{ width: 'auto', height: 'auto' }}
          />
        ) : (
          <span className="text-3xl">{order.giftcards?.[0]?.brand?.icon || '📦'}</span>
        )
      }
      topRightContent={
        <>
          <span className="text-md text-foreground font-semibold md:text-lg">{formatCurrency(order.faceValueTotal, { currency })}</span>
          <span className="text-muted-foreground text-xs md:text-sm">Precio: {formatCurrency(order.effectiveTotal, { currency })}</span>
        </>
      }
      date={formatDateTime(order.createdAt, 'es-AR')}
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={() => onToggle?.()}
      hasReport={hasReports}
      activeBgClass={status.activeBg}
      progress={{
        percentage: progressPercentage,
        colorClass: 'bg-primary',
        fullColorClass: order.status === 'COMPLETED' ? 'bg-emerald-500' : order.status === 'CANCELLED' ? 'bg-destructive' : undefined,
      }}
      actions={
        isActionable ? (
          <>
            {canCancel && (
              <Button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
              >
                {isCancelling && <Spinner size="sm" className="mr-1" />}
                Cancelar
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <AdminOrderDetails order={order} onAddReport={onAddReport} onEditReport={onEditReport} onDeleteReport={onDeleteReport} />
    </RegistryCard>
  );
};
