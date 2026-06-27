'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { AdminOrderCard } from '@/components/admin/orders/admin-order-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminOrder } from '@/types';
import type { Giftcard } from '@/types';

interface AdminOrdersListProps {
  orders: AdminOrder[];
  totalPages: number;
  onViewBuyer?: (order: AdminOrder) => void;
  onAddReport?: (card: Giftcard) => void;
  onEditReport?: (card: Giftcard) => void;
  onDeleteReport?: (card: Giftcard) => void;
}

export function AdminOrdersList({ orders, totalPages, onViewBuyer, onAddReport, onEditReport, onDeleteReport }: AdminOrdersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userInteractingRef = useRef(false);
  const autoExpandTargetRef = useRef<string | null>(null);

  // Scroll to top when expanding
  useEffect(() => {
    if (expandedId !== null) {
      const container = listRef.current?.closest('.overflow-y-scroll, .overflow-y-auto');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [expandedId]);

  // Auto-expand order if it contains a search match - compute outside effect
  const orderWithMatchId = useMemo(() => {
    const order = orders.find((o) => o.giftcards.some((g) => g.isSearchMatch));
    return order?.id ?? null;
  }, [orders]);

  // Track auto-expand target in a ref
  useEffect(() => {
    if (orderWithMatchId && !userInteractingRef.current) {
      autoExpandTargetRef.current = orderWithMatchId;
    } else {
      autoExpandTargetRef.current = null;
    }
  }, [orderWithMatchId]);

  // Apply auto-expand when target changes and user isn't interacting
  useEffect(() => {
    if (autoExpandTargetRef.current && expandedId === null) {
      const target = autoExpandTargetRef.current;
      // Only apply if still valid and user hasn't started interacting
      if (!userInteractingRef.current && target === orderWithMatchId) {
        setExpandedId(target);
      }
    }
  }, [orderWithMatchId, expandedId]);

  const handleToggle = useCallback((orderId: string) => {
    userInteractingRef.current = true;
    autoExpandTargetRef.current = null;
    setExpandedId((prev) => {
      const next = prev === orderId ? null : orderId;
      if (next === null) {
        setLastExpandedId(orderId);
      } else {
        setLastExpandedId(null);
      }
      return next;
    });
    // Reset user interaction flag after a delay
    setTimeout(() => {
      userInteractingRef.current = false;
    }, 500);
  }, []);

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
    <div className="space-y-1" ref={listRef}>
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
    </div>
  );
}
