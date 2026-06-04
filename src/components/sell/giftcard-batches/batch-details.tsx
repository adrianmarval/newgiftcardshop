import { formatCurrency } from '@/lib/currency-formatter';
import { GiftcardItem } from '@/components/ui/giftcard-item';
import { CheckCircle2 } from 'lucide-react';
import { SellerBatch } from '@/types';

/**
 * Props for the BatchDetails component.
 * Shows detailed view of a single batch's giftcards.
 */
export interface BatchDetailsProps {
  batch: SellerBatch;
}

export function BatchDetails({ batch }: BatchDetailsProps) {
  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium md:text-base">{batch.giftcards.length} cards confirmed</span>
        <span className="text-muted-foreground text-xs font-medium md:text-base">Batch Rate: {(batch.sellRate * 100).toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 md:gap-1 xl:grid-cols-3">
        {batch.giftcards.map((card) => (
          <GiftcardItem key={card.id} card={card} showCopyButton={false} />
        ))}
      </div>

      {batch.payments.length > 0 && (
        <div className="mt-3 space-y-1">
          {batch.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2"
            >
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-500">#{p.id.slice(-6).toUpperCase()}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-500">+{formatCurrency(p.amount, { currency: 'USD' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
