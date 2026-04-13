"use client";

import { useState } from "react";
import { OrdersStats } from "./orders-stats";
import { OrdersFilters } from "./orders-filters";
import { OrdersList } from "./orders-list";
import { CardDetailDialog } from "./card-detail-dialog";
import type { BuyerOrder, BuyerOrderGiftcard, OrderStatus } from "@/types";

interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export function BuyerOrdersView({ orders, pagination }: BuyerOrdersViewProps) {
  const [selectedCard, setSelectedCard] = useState<{ card: BuyerOrderGiftcard; orderStatus: OrderStatus } | null>(null);

  const handleCardClick = (card: BuyerOrderGiftcard, orderStatus: OrderStatus) => {
    setSelectedCard({ card, orderStatus });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Stats Section */}
      <OrdersStats orders={orders} totalCount={pagination.totalCount} />

      {/* 2. Filters & Actions */}
      <OrdersFilters />

      {/* 3. Order List */}
      <OrdersList orders={orders} totalPages={pagination.totalPages} onCardClick={handleCardClick} />

      {/* 4. Details Dialog */}
      <CardDetailDialog
        card={selectedCard?.card ?? null}
        orderStatus={selectedCard?.orderStatus ?? null}
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
    </div>
  );
}
