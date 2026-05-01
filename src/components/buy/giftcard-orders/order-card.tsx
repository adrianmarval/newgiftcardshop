'use client';

import { useRouter } from 'next/navigation';
import { useState, MouseEvent } from 'react';
import { RegistryCard } from '@/components/ui/registry-card';
import { formatDateTime } from '@/lib/date-formatter';
import { formatCurrency } from '@/lib/currency-formatter';
import { Button } from '@/components/ui/button';
import { showAlert } from '@/lib/swal';
import { OrderDetails } from '@/components/buy/giftcard-orders/order-details';
import { cancelOrder } from '@/actions/order/cancel';
import { Spinner } from '@/components/ui/spinner';
import type { OrderCardProps } from './types';
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

export const OrderCard = ({ order, isExpanded = false, onToggle = () => {} }: OrderCardProps) => {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = statusConfig[order.status] || { label: order.status, color: 'bg-muted', activeBg: 'bg-muted/10 dark:bg-muted/15' };
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const hasReport = order.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const currency = order.giftcards[0]?.country?.currency || 'USD';

  const handleResumeOrder = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(`/buy/dashboard/browse-cards?orderId=${order.id}`);
  };

  const handleCancelOrder = async (e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm('¿Cancelar orden?', '¿Seguro que quieres cancelar esta orden?');
    if (!confirmed) return;
    setIsCancelling(true);
    try {
      const result = await cancelOrder({ orderId: order.id });
      if (result.serverError || result.validationErrors) {
        showAlert.toast.error('Error al cancelar la orden');
      } else {
        showAlert.toast.success('Orden cancelada con éxito');
        router.refresh();
      }
    } catch (error) {
      showAlert.toast.error('Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <RegistryCard
      id={order.id}
      title={`Orden #${order.id.slice(-8).toUpperCase()}`}
      icon={
        <Image
          src={order.giftcards?.[0]?.brand?.image || '/'}
          alt={order.giftcards?.[0]?.brand?.name || 'Order'}
          width={40}
          height={40}
          className={`h-10 w-10 rounded-lg object-contain p-1 ${status.color}`}
          style={{ width: 'auto', height: 'auto' }}
        />
      }
      topRightContent={
        <>
          <span className="text-md text-foreground font-semibold md:text-lg">{formatCurrency(order.faceValueTotal, { currency })}</span>
          <span className="text-muted-foreground text-xs md:text-sm">Precio: {formatCurrency(order.effectiveTotal, { currency })}</span>
        </>
      }
      date={formatDateTime(order.createdAt, 'es-AR')}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasReport={hasReport}
      activeBgClass={status.activeBg}
      progress={{
        percentage: progressPercentage,
        colorClass: 'bg-primary',
        fullColorClass: order.status === 'COMPLETED' ? 'bg-emerald-500' : order.status === 'CANCELLED' ? 'bg-destructive' : undefined,
      }}
      actions={
        isActionable ? (
          <>
            <Button onClick={handleResumeOrder} size="sm" className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm">
              Completar Orden
            </Button>
            {canCancel && (
              <Button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
              >
                {isCancelling && <Spinner size="sm" className="mr-1" />}
                Cancelar Orden
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <OrderDetails order={order} />
    </RegistryCard>
  );
};
