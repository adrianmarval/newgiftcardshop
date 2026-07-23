'use client';

import { CardFooter } from '@/components/ui/card';
import { showAlert } from '@/lib/ui';
import { GiftcardItem } from '@/components/common';
import { deleteCard } from '@/actions/admin/batches';
import { formatCurrency } from '@/lib/utils';
import { AdminBatchGallery } from './admin-batch-gallery';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { AdminBatch } from '@/types';

interface AdminBatchDetailsProps {
  batch: AdminBatch;
  onDeleted: () => void;
}

export function AdminBatchDetails({ batch, onDeleted }: AdminBatchDetailsProps) {
  const handleDeleteCard = async (cardId: string) => {
    const confirmed = await showAlert.confirm('¿Eliminar tarjeta?', '¿Eliminar esta tarjeta? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      const result = await deleteCard({ cardId });
      if (result.serverError) {
        showAlert.error('Error', result.serverError);
      } else if (result.data?.error) {
        showAlert.error('Error', result.data.error);
      } else {
        showAlert.toast.success('Tarjeta eliminada');
        onDeleted();
      }
    } catch (error) {
      showAlert.error('Error', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const completedPayments = batch.payments.filter((p) => p.status === 'COMPLETED');
  const successfulPayment = completedPayments.length > 0 ? completedPayments[completedPayments.length - 1] : null;

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-1 text-xs md:text-sm">
          <span>{batch.cardsCount} tarjetas</span>
          <span>Confirmadas: {batch.confirmedCount}</span>
          <span>Tasa: {(batch.sellRate * 100).toFixed(1)}%</span>
        </div>
        <AdminBatchGallery batchId={batch.id.toString()} giftcards={batch.giftcards} />
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {batch.giftcards.map((card) => (
          <GiftcardItem
            key={card.id}
            card={card}
            hasIssues={Boolean(card.issues && card.issues.length > 0)}
            onDelete={card.orderId ? undefined : handleDeleteCard}
            contextualInfo={
              card.buyer ? (
                <CardFooter className="bg-muted/30 mt-auto flex items-center justify-between border-t p-1 px-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <div className="border-primary/20 bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                      <span className="text-primary text-[10px] font-bold">{card.buyer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-foreground truncate text-[11px] leading-tight font-semibold">{card.buyer.name}</span>
                      <span className="text-muted-foreground truncate text-[9px] leading-tight">{card.buyer.email}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground ml-2 shrink-0 text-[9px] font-bold tracking-widest uppercase">Comprador</span>
                </CardFooter>
              ) : undefined
            }
          />
        ))}
      </div>

      {successfulPayment && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500">Pago al seller completado</span>
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
    </div>
  );
}
