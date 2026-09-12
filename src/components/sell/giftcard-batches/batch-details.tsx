'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { GiftcardItem } from '@/components/common';
import { CheckCircle2, ExternalLink, ImagePlus, Images } from 'lucide-react';
import { ProvenanceImageDialog } from './provenance-image-dialog';
import type { SellerBatch } from '@/types';
import { Button } from '@/components/ui/button';

/**
 * Props for the BatchDetails component.
 * Shows detailed view of a single batch's giftcards.
 */
export interface BatchDetailsProps {
  batch: SellerBatch;
}

export function BatchDetails({ batch }: BatchDetailsProps) {
  const queryClient = useQueryClient();
  const [proofTarget, setProofTarget] = useState<{ id: string; hasImage: boolean } | null>(null);

  const completedPayments = batch.payments.filter((p) => p.status === 'COMPLETED');
  const successfulPayment = completedPayments.length > 0 ? completedPayments[completedPayments.length - 1] : null;

  return (
    <div data-tour="batch-details" className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        {batch.cancelledAt ? (
          <span className="text-destructive text-xs font-medium md:text-base">Cancelled</span>
        ) : (
          <span className="text-muted-foreground text-xs font-medium md:text-base">{batch.giftcards.length} cards confirmed</span>
        )}
        <span className="text-muted-foreground text-xs font-medium md:text-base">Batch Rate: {(batch.sellRate * 100).toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 md:gap-1 xl:grid-cols-3">
        {batch.giftcards.map((card) => (
          <GiftcardItem
            key={card.id}
            card={card}
            showCopyButton={false}
            contextualInfo={
              <Button
                variant={"secondary"}
                size={"sm"}
                onClick={() => setProofTarget({ id: card.id, hasImage: card.hasProvenanceImage ?? false })}
                className="text-muted-foreground hover:text-foreground border-border/60 flex w-full items-center justify-center gap-1 border-t py-1.5 text-[10px] font-medium transition-colors"
              >
                {card.hasProvenanceImage ? (
                  <>
                    <Images className="h-3 w-3 text-emerald-500" />
                    Open Image
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-3 w-3" />
                    Add image
                  </>
                )}
              </Button>
            }
          />
        ))}
      </div>

      {successfulPayment && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500">Pago recibido</span>
            </div>
            <span className="text-xs font-semibold text-emerald-500">+{formatCurrency(successfulPayment.amount, { currency: 'USD' })}</span>
          </div>
          {successfulPayment.binanceTxId && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-1.5">
              <span className="text-muted-foreground text-[10px]">{successfulPayment.isBinanceWallet ? 'Ref interna' : 'Tx ID de red'}</span>
              {successfulPayment.isBinanceWallet ? (
                <span className="font-mono text-[10px] text-emerald-500">
                  {successfulPayment.binanceTxId}
                </span>
              ) : (
                <a
                  href={`https://bscscan.com/tx/${successfulPayment.binanceTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-[10px] text-emerald-500 hover:underline"
                >
                  {successfulPayment.binanceTxId.slice(0, 6)}...{successfulPayment.binanceTxId.slice(-4)}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <ProvenanceImageDialog
        open={proofTarget !== null}
        onOpenChange={(open) => {
          if (!open) setProofTarget(null);
        }}
        giftcardId={proofTarget?.id ?? null}
        hasExistingImage={proofTarget?.hasImage ?? false}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['seller-batches'] })}
      />
    </div>
  );
}
