import { CardFooter } from '@/components/ui/card';
import { showAlert } from '@/lib/swal';
import { GiftcardItem } from '@/components/ui/giftcard-item';
import { deleteCard } from '@/actions/admin/batches';
import { formatCurrency } from '@/lib/currency-formatter';
import { AdminBatchGallery } from './admin-batch-gallery';
import { AdminBatch } from '@/types';

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

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-4 text-xs md:text-sm">
          <span>{batch.cardsCount} tarjetas</span>
          <span>Confirmadas: {batch.confirmedCount}</span>
          <span>Tasa: {(batch.sellRate * 100).toFixed(1)}%</span>
        </div>
        <AdminBatchGallery batchId={batch.id.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {batch.giftcards.map((card) => (
          <GiftcardItem
            key={card.id}
            card={card}
            hasIssues={Boolean(card.issues && card.issues.length > 0)}
            onDelete={card.orderId ? undefined : handleDeleteCard}
            contextualInfo={
              card.buyer ? (
                <CardFooter className="bg-muted/30 mt-auto flex items-center justify-between border-t p-1 px-3">
                  <div className="flex min-w-0 items-center gap-2">
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

      {batch.payments && batch.payments.length > 0 && (
        <div className="mt-3 space-y-1">
          {batch.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-500">Pago #{p.id.slice(-6).toUpperCase()}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-500">+{formatCurrency(p.amount, { currency: 'USD' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
