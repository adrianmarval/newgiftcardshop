'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminOrdersListProps } from './types';

export function AdminOrdersList({
  orders,
  totalPages,
  onCardClick,
  onViewBuyer,
  onAddReport,
  onEditReport,
  onDeleteReport,
}: AdminOrdersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const orderWithMatch = orders.find((o) => o.giftcards.some((g) => g.isSearchMatch));
    if (orderWithMatch) {
      setExpandedId(orderWithMatch.id);
    }
  }, [orders]);

  const handleToggle = (orderId: string) => {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  };

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
        <AnimatePresence>
          {orders
            .filter((order) => expandedId === null || expandedId === order.id)
            .map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <AdminOrderCard
                  order={order}
                  onCardClick={onCardClick}
                  onViewBuyer={onViewBuyer}
                  onAddReport={onAddReport}
                  onEditReport={onEditReport}
                  onDeleteReport={onDeleteReport}
                  isExpanded={expandedId === order.id}
                  onToggle={() => handleToggle(order.id)}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
      <UrlPagination totalPages={totalPages} />
    </>
  );
}
