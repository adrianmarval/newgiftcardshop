'use client';

import { MouseEvent } from 'react';
import { RegistryCard, useCancelOrderAction, useCardProgress, useCardCurrency, getOrderProgressConfig, getOrderActiveBg, getOrderHasReports, getOrderStatusLabel, CopyableId, BrandIcon, OrderTopRight, UserBadge } from '@/components/common';
import { formatDateTime, formatOrderShareText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AdminOrderDetails } from '@/components/admin/orders/admin-order-details';
import type { AdminOrder, AdminBuyerSummary, AdminSellerSummary, Giftcard } from '@/types';

interface AdminOrderCardProps {
  order: AdminOrder;
  onViewBuyer?: (buyer: AdminBuyerSummary) => void;
  onViewSeller?: (seller: AdminSellerSummary) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
}

export const AdminOrderCard = ({
  order,
  onViewBuyer,
  onViewSeller,
  onAddReport,
  onEditReport,
  onDeleteReport,
  isExpanded = false,
  isHighlighted = false,
  onToggle,
}: AdminOrderCardProps) => {
  const { progressPercentage } = useCardProgress(order);
  const { cancel, isCancelling } = useCancelOrderAction(['admin-orders']);
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const hasReports = getOrderHasReports(order.giftcards);
  const currency = useCardCurrency(order.giftcards);
  const statusLabel = getOrderStatusLabel(order.status, 'es');

  return (
    <RegistryCard
      id={order.id}
      title={<CopyableId id={order.id} prefix="Orden #" shareText={formatOrderShareText(order)} />}
      subtitle={
        <UserBadge
          user={order.buyer}
          size="sm"
          onLongPress={() => onViewBuyer?.(order.buyer)}
          hint="Mantén presionado para ver info"
        />
      }
      icon={<BrandIcon image={order.giftcards?.[0]?.brand?.image} name={order.giftcards?.[0]?.brand?.name} fallbackIcon={order.giftcards?.[0]?.brand?.icon} />}
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
      hasReport={hasReports}
      activeBgClass={getOrderActiveBg(order.status)}
      progress={getOrderProgressConfig(order.status, progressPercentage)}
      statusLabel={statusLabel}
      actions={
        isActionable && canCancel ? (
          <Button
            onClick={(e) => cancel(order.id, e as unknown as MouseEvent)}
            disabled={isCancelling}
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
          >
            {isCancelling && <Spinner size="sm" className="mr-1" />}
            Cancelar
          </Button>
        ) : undefined
      }
    >
      <AdminOrderDetails order={order} onViewSeller={onViewSeller} onAddReport={onAddReport} onEditReport={onEditReport} onDeleteReport={onDeleteReport} />
    </RegistryCard>
  );
};