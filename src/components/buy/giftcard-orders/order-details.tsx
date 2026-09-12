'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, ImageIcon } from 'lucide-react';
import { GiftcardItem } from '@/components/common';
import { Button } from '@/components/ui/button';
import { UnlockGate } from '@/components/buy/security/unlock-gate';
import { IssueProofDialog } from '@/components/buy/issue-proof-dialog';
import type { BuyerOrder } from '@/types';

export interface OrderDetailsProps {
  order: BuyerOrder;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const queryClient = useQueryClient();
  // Issue al que se le está adjuntando evidencia (attach tardío desde el historial)
  const [attachIssueId, setAttachIssueId] = useState<string | null>(null);

  // Post-unlock y post-attach: invalidar la query de la lista (buyer-orders) — el
  // refetch via /api/query revela los códigos / refleja la evidencia. NUNCA
  // router.refresh(): aborta navegaciones en vuelo (ver lib/utils/api-query).
  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });

  // El anchor vive en el wrapper para que el tour lo encuentre también cuando
  // los códigos están bloqueados (el UnlockGate es parte de la explicación).
  return (
    <div data-tour="order-details">
      {order.codesLocked ? (
        <UnlockGate onUnlocked={refreshOrders} description="Verificá tu identidad para ver los códigos." />
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
              <GiftcardItem
                key={card.id}
                card={card}
                showCopyButton={false}
                contextualInfo={
                  card.issue ? (
                    <div className="bg-card border-border rounded-b-2xl border border-t-0 px-2 ">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-primary h-6 w-full gap-1.5 text-[10px] font-semibold md:text-xs"
                        onClick={() => setAttachIssueId(card.issue!.id)}
                      >
                        {card.issue.hasProof ? (
                          <>
                            <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                            Ver Captura
                          </>
                        ) : (
                          <>
                            <ImagePlus className="h-3.5 w-3.5" />
                            Adjuntar evidencia
                          </>
                        )}
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {attachIssueId && (
        <IssueProofDialog
          mode="attach"
          open
          onOpenChange={(open) => {
            if (!open) setAttachIssueId(null);
          }}
          issueId={attachIssueId}
          onSuccess={refreshOrders}
        />
      )}
    </div>
  );
}
