'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminOrdersListProps } from './types';

export function AdminOrdersList({ orders, totalPages, onViewBuyer, onAddReport, onEditReport, onDeleteReport }: AdminOrdersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number>(0);

  useEffect(() => {
    const orderWithMatch = orders.find((o) => o.giftcards.some((g) => g.isSearchMatch));
    if (orderWithMatch) {
      setExpandedId(orderWithMatch.id);
    }
  }, [orders]);

  const handleToggle = (orderId: string) => {
    // Guardar el scroll actual antes de expandir si no hay nada expandido
    if (expandedId === null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        savedScrollTop.current = container.scrollTop;
      }
    }

    setExpandedId((prev) => {
      const next = prev === orderId ? null : orderId;
      if (next === null) {
        setLastExpandedId(orderId);
      } else {
        setLastExpandedId(null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (expandedId === null && lastExpandedId !== null) {
      const timer = setTimeout(() => {
        const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
        if (container && savedScrollTop.current > 0) {
          container.scrollTo({ top: savedScrollTop.current, behavior: 'auto' });
          savedScrollTop.current = 0;
        } else {
          const element = document.getElementById(`registry-card-${lastExpandedId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [expandedId, lastExpandedId]);

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
    <div className="space-y-2" ref={listRef}>
      <div className="flex flex-col gap-2">
        {orders
          .filter((order) => expandedId === null || expandedId === order.id)
          .map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <AdminOrderCard
                order={order}
                onViewBuyer={onViewBuyer}
                onAddReport={onAddReport}
                onEditReport={onEditReport}
                onDeleteReport={onDeleteReport}
                isExpanded={expandedId === order.id}
                isHighlighted={lastExpandedId === order.id}
                onToggle={() => handleToggle(order.id)}
              />
            </motion.div>
          ))}
      </div>
      <UrlPagination totalPages={totalPages} />
    </div>
  );
}
