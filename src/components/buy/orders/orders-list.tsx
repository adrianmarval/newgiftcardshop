"use client";

import { AnimatePresence } from "framer-motion";
import { History } from "lucide-react";
import { OrderCard } from "./order-card";
import { UrlPagination } from "@/components/ui/url-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrdersListProps } from "@/types";

export function OrdersList({ orders, totalPages, onCardClick }: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<History className="w-12 h-12 text-muted-foreground/20" />}
        title="No records found"
        description="Try adjusting your filters or search keywords."
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onCardClick={onCardClick} />
          ))}
        </AnimatePresence>
      </div>
      <UrlPagination totalPages={totalPages} />
    </>
  );
}
