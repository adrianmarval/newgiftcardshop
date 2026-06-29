'use client';

import { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { RegistryCard, useCancelOrderAction, useCardProgress, useCardCurrency, getOrderProgressConfig, getOrderActiveBg, getOrderHasReports, CopyableId, BrandIcon, OrderTopRight } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLongPress } from '@/hooks/use-long-press';
import { AdminOrderDetails } from '@/components/admin/orders/admin-order-details';
import type { AdminOrder, Giftcard } from '@/types';

interface AdminOrderCardProps {
  order: AdminOrder;
  onViewBuyer?: (order: AdminOrder) => void;
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
  onAddReport,
  onEditReport,
  onDeleteReport,
  isExpanded = false,
  isHighlighted = false,
  onToggle,
}: AdminOrderCardProps) => {
  const { progressPercentage } = useCardProgress(order);
  const { cancel, isCancelling } = useCancelOrderAction();
  const canCancel = order.effectiveTotal === 0 && (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT');
  const isActionable = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';
  const hasReports = getOrderHasReports(order.giftcards);
  const currency = useCardCurrency(order.giftcards);

  return (
    <RegistryCard
      id={order.id}
      title={<CopyableId id={order.id} prefix="Orden #" />}
      subtitle={
        <motion.button
          {...useLongPress({
            onLongPress: (e) => {
              e.stopPropagation();
              onViewBuyer?.(order);
            },
            onClick: (e) => e.stopPropagation(),
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
      <AdminOrderDetails order={order} onAddReport={onAddReport} onEditReport={onEditReport} onDeleteReport={onDeleteReport} />
    </RegistryCard>
  );
};