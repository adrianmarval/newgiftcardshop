'use client';

import { useRouter } from 'next/navigation';
import { GiftcardItem } from '@/components/common';
import { UnlockGate } from '@/components/buy/security/unlock-gate';
import type { BuyerOrder } from '@/types';

export interface OrderDetailsProps {
  order: BuyerOrder;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const router = useRouter();

  // El anchor vive en el wrapper para que el tour lo encuentre también cuando
  // los códigos están bloqueados (el UnlockGate es parte de la explicación).
  return (
    <div data-tour="order-details">
      {order.codesLocked ? (
        <UnlockGate onUnlocked={() => router.refresh()} description="Verificá tu identidad para ver los códigos." />
      ) : (
        <div className="space-y-3">
          <div className="mb-3 flex items-center justify-between">
            {order.status === 'CANCELLED' ? (
              <span className="text-destructive text-xs font-medium md:text-base">Cancelled</span>
            ) : (
              <span className="text-muted-foreground text-xs font-medium md:text-base">{order.giftcards.length} cards confirmed</span>
            )}
            <span className="text-muted-foreground text-xs font-medium md:text-base">Order Rate: {order.buyRate * 100}%</span>
          </div>

          <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {order.giftcards.map((card) => (
              <GiftcardItem key={card.id} card={card} showCopyButton={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
