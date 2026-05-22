'use client';

import { useRouter } from 'next/navigation';
import { useState, MouseEvent } from 'react';
import { RegistryCard } from '@/components/ui/registry-card';
import { formatDateTime } from '@/lib/date-formatter';
import { formatCurrency } from '@/lib/currency-formatter';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { showAlert } from '@/lib/swal';
import { OrderDetails } from '@/components/buy/giftcard-orders/order-details';
import { cancelOrder } from '@/actions/buyer/orders/cancel-order';
import { Spinner } from '@/components/ui/spinner';
import { orderStatusConfig } from '@/lib/ui-config';
import Image from 'next/image';
import { BuyerOrder } from '@/types';

export interface OrderCardProps {
  order: BuyerOrder;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle?: () => void;
}

export const OrderCard = ({ order, isExpanded = false, isHighlighted = false, onToggle = () => {} }: OrderCardProps) => {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const confirmedCount = order.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = order.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const status = orderStatusConfig[order.status] ?? { label: order.status, color: 'bg-muted', activeBg: 'bg-muted/10 dark:bg-muted/15' };
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const hasReport = order.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const currency = order.giftcards[0]?.country?.currency || 'USD';
  const faceValueCurrency = currency;
  const paymentCurrency = 'USD';

  const handleResumeOrder = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(`/store/dashboard/browse-cards?orderId=${order.id}`);
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
      console.error(error);
      showAlert.toast.error('Error al cancelar');
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
          <span className="text-md text-foreground font-semibold md:text-lg">
            {formatCurrency(order.faceValueTotal, { currency: faceValueCurrency })}
          </span>
          <span className="text-muted-foreground text-xs md:text-sm">
            Precio: {formatCurrency(order.effectiveTotal, { currency: paymentCurrency })}
          </span>
        </>
      }
      date={formatDateTime(order.createdAt, 'es-AR')}
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
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
