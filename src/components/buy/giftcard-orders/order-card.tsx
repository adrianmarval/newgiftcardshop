'use client';

import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';
import { RegistryCard, useCancelOrderAction, useCardProgress, useCardCurrency, getOrderProgressConfig, getOrderActiveBg, getOrderStatusLabel, CopyableId, BrandIcon, OrderTopRight } from '@/components/common';
import { formatDateTime, formatOrderShareText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { OrderDetails } from '@/components/buy/giftcard-orders/order-details';
import type { BuyerOrder } from '@/types';

export interface OrderCardProps {
  order: BuyerOrder;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle?: () => void;
}

export const OrderCard = ({ order, isExpanded = false, isHighlighted = false, onToggle = () => {} }: OrderCardProps) => {
  const router = useRouter();
  const { progressPercentage } = useCardProgress(order);
  const { cancel, isCancelling } = useCancelOrderAction();
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const currency = useCardCurrency(order.giftcards);
  const hasReport = order.giftcards.some((g) => g.isConfirmed && g.status !== 'USED');
  const statusLabel = getOrderStatusLabel(order.status, 'es');

  const handleResumeOrder = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(`/store/dashboard/browse-cards?orderId=${order.id}`);
  };

  return (
    <RegistryCard
      id={order.id}
      title={<CopyableId id={order.id} prefix="Orden #" shareText={formatOrderShareText(order)} />}
      icon={
        <BrandIcon
          image={order.giftcards?.[0]?.brand?.image}
          name={order.giftcards?.[0]?.brand?.name}
          className="h-10 w-10 rounded-lg object-contain p-1"
        />
      }
      topRightContent={
        <OrderTopRight
          faceValueTotal={order.faceValueTotal}
          effectiveTotal={order.effectiveTotal}
          faceValueCurrency={currency}
          paymentCurrency="USD"
        />
      }
      date={formatDateTime(order.createdAt, 'es-AR')}
      isExpanded={isExpanded}
      isHighlighted={isHighlighted}
      onToggle={onToggle}
      hasReport={hasReport}
      activeBgClass={getOrderActiveBg(order.status)}
      progress={getOrderProgressConfig(order.status, progressPercentage)}
      statusLabel={statusLabel}
      actions={
        isActionable ? (
          <>
            <Button variant="destructive" onClick={handleResumeOrder} size="sm" className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm">
              Completar Orden
            </Button>
            {canCancel && (
              <Button
                onClick={(e) => cancel(order.id, e)}
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