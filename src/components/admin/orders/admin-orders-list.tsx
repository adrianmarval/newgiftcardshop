'use client';

import { RegistryList } from '@/components/common';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import type { AdminOrder, Giftcard } from '@/types';

interface AdminOrdersListProps {
  orders: AdminOrder[];
  totalPages: number;
  onViewBuyer?: (order: AdminOrder) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

export function AdminOrdersList({ orders, onViewBuyer, onAddReport, onEditReport, onDeleteReport }: AdminOrdersListProps) {
  return (
    <RegistryList
      items={orders}
      getId={(o) => o.id}
      getMatch={(o) => o.giftcards.some((g) => g.isSearchMatch) ? o.id : null}
      renderItem={(order, { isExpanded, isHighlighted, onToggle }) => (
        <AdminOrderCard
          order={order}
          onViewBuyer={onViewBuyer}
          onAddReport={onAddReport}
          onEditReport={onEditReport}
          onDeleteReport={onDeleteReport}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          onToggle={onToggle}
        />
      )}
    />
  );
}