'use client';

import { GiftcardItem } from '@/components/common/giftcard-item';
import type { BuyerOrder } from '@/types';

export interface OrderDetailsProps {
  order: BuyerOrder;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-base">{order.giftcards.length} cards confirmed</span>
        <span className="text-muted-foreground text-xs font-medium md:text-base">Order Rate: {order.buyRate * 100}%</span>
      </div>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {order.giftcards.map((card) => (
          <GiftcardItem key={card.id} card={card} showCopyButton={false} />
        ))}
      </div>
    </div>
  );
}
