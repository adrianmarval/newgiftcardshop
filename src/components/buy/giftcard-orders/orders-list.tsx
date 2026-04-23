'use client';

import { AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { OrderCard } from '@/components/buy/giftcard-orders/order-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { OrdersListProps } from './types';

export const OrdersList = ({ orders, totalPages, onCardClick }: OrdersListProps) => {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<History className="text-muted-foreground/20 h-12 w-12" />}
        title="No se encontraron registros"
        description="Intenta ajustar tus filtros o palabras clave de búsqueda."
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onCardClick={onCardClick} />
          ))}
        </AnimatePresence>
      </div>
      <UrlPagination totalPages={totalPages} />
    </>
  );
};
