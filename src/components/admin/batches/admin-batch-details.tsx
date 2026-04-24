'use client';

import { motion } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { adminCardDelete } from '@/actions/admin/admin-card-delete';
import Image from 'next/image';
import type { AdminBatch } from '@/types/domain/admin';

interface AdminBatchDetailsProps {
  batch: AdminBatch;
  onDeleted: () => void;
}

const statusColors: Record<string, string> = {
  UNUSED: 'bg-emerald-500/10 text-emerald-500',
  USED: 'bg-blue-500/10 text-blue-500',
  ALREADY_USED: 'bg-destructive/10 text-destructive',
  INVALID: 'bg-destructive/10 text-destructive',
  DEACTIVATED: 'bg-destructive/10 text-destructive',
  WRONG_AMOUNT: 'bg-amber-500/10 text-amber-500',
};

export function AdminBatchDetails({ batch, onDeleted }: AdminBatchDetailsProps) {
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('¿Eliminar esta tarjeta? Esta acción no se puede deshacer.')) return;
    try {
      const result = await adminCardDelete({ cardId });
      if (result.serverError) {
        toast.error('Error', { description: result.serverError });
      } else if (result.data?.error) {
        toast.error('Error', { description: result.data.error });
      } else {
        toast.success('Tarjeta eliminada');
        onDeleted();
      }
    } catch (error) {
      toast.error('Error', { description: error instanceof Error ? error.message : 'Error desconocido' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span>{batch.cardsCount} tarjetas</span>
          <span>Confirmadas: {batch.confirmedCount}</span>
          <span>Tasa: {(batch.sellRate * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-1">
        {batch.giftcards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-muted/50 flex items-start justify-between gap-2 rounded-lg px-2 py-2 md:items-center"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="border-border bg-background relative h-6 w-6 shrink-0 overflow-hidden rounded border md:h-8 md:w-8">
                {card.brand.image ? (
                  <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain p-0.5" loading="eager" />
                ) : (
                  <span className="text-xs md:text-lg">{card.brand.icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs">{card.claimCode}</div>
                {card.buyer && (
                  <div className="text-muted-foreground text-[10px]">
                    Comprador: {card.buyer.name} ({card.buyer.email})
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium md:text-sm">${card.amount.toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  <Badge className={`${statusColors[card.status]} px-1 py-0 text-[9px] md:text-xs`}>{card.status}</Badge>
                  {card.issues && card.issues.length > 0 && (
                    <span className="text-destructive flex items-center gap-0.5 text-[9px] md:text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Problema
                    </span>
                  )}
                </div>
              </div>
              {!card.orderId && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCard(card.id);
                  }}
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-6 w-6 md:h-8 md:w-8"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              )}
            </div>
          </motion.div>
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
              <span className="text-xs font-semibold text-emerald-500">+${p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
