'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import { UrlPagination } from '@/components/ui/url-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminOrdersListProps } from './types';

export function AdminOrdersList({ orders, totalPages, onViewBuyer, onAddReport, onEditReport, onDeleteReport }: AdminOrdersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to top when expanding
  useEffect(() => {
    if (expandedId !== null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [expandedId]);

  // Auto-expand order if it contains a search match
  useEffect(() => {
    const orderWithMatch = orders.find((o) => o.giftcards.some((g) => g.isSearchMatch));
    if (orderWithMatch) {
      setExpandedId(orderWithMatch.id);
    }
  }, [orders]);

  const handleToggle = (orderId: string) => {
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
        const element = document.getElementById(`registry-card-${lastExpandedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
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
      <AnimatePresence>
        {orders
          .filter((order) => expandedId === null || expandedId === order.id)
          .map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
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
      </AnimatePresence>
      <UrlPagination totalPages={totalPages} />
    </div>
  );
}
