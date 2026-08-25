'use client';

import { useSearchParams } from 'next/navigation';
import { RegistryList } from '@/components/common';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import type { AdminOrder, AdminBuyerSummary, AdminSellerSummary, Giftcard } from '@/types';

interface AdminOrdersListProps {
  orders: AdminOrder[];
  totalPages: number;
  onViewBuyer?: (buyer: AdminBuyerSummary) => void;
  onViewSeller?: (seller: AdminSellerSummary) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

function matchesBuyerFields(order: AdminOrder, search: string): boolean {
  const s = search.toLowerCase();
  return (
    order.buyer.email.toLowerCase().includes(s) ||
    (order.buyer.telegramUser?.username ?? '').toLowerCase().includes(s) ||
    (order.buyer.telegramUser?.firstName ?? '').toLowerCase().includes(s)
  );
}

export function AdminOrdersList({ orders, onViewBuyer, onViewSeller, onAddReport, onEditReport, onDeleteReport }: AdminOrdersListProps) {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';

  return (
    <RegistryList
      items={orders}
      getId={(o) => o.id}
      getMatch={(o) => {
        if (o.giftcards.some((g) => g.isSearchMatch)) return o.id;
        if (search && matchesBuyerFields(o, search)) return o.id;
        return null;
      }}
      renderItem={(order, { isExpanded, isHighlighted, onToggle }) => (
        <AdminOrderCard
          order={order}
          onViewBuyer={onViewBuyer}
          onViewSeller={onViewSeller}
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
