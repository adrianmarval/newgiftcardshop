'use client';

import { motion } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ClaimCodeField } from '@/components/ui/claim-code-field';
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
        <div className="text-muted-foreground flex items-center gap-4 text-xs md:text-sm">
          <span>{batch.cardsCount} tarjetas</span>
          <span>Confirmadas: {batch.confirmedCount}</span>
          <span>Tasa: {(batch.sellRate * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {batch.giftcards.map((card) => (
          <motion.div key={card.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
            <Card className="p-0  gap-1 group flex h-full flex-col overflow-hidden rounded-t-2xl rounded-b-none border-b-0 shadow-sm transition-all hover:shadow-md">
              {/* TOP HALF: Gift Card Design */}
              <div className="bg-muted/50 relative h-28 w-full shrink-0">
                {card.brand.image ? (
                  <>
                    <Image src={card.brand.image} alt={card.brand.name} fill className="object-contain" loading="eager" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/40" />
                  </>
                ) : (
                  <div className="from-primary/80 to-primary/30 absolute inset-0 bg-linear-to-br" />
                )}

                <div className="absolute inset-0 flex flex-col justify-between p-3">
                  <div className="flex w-full items-start justify-between">
                    <Badge
                      className={`${statusColors[card.status]} border-border/50 bg-background/95 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm backdrop-blur-md`}
                    >
                      {card.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {card.issues && card.issues.length > 0 && (
                        <div
                          className="bg-destructive/90 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm backdrop-blur-sm"
                          title="Con problemas"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {!card.orderId && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/90 bg-background/40 h-7 w-7 rounded-full text-white opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase drop-shadow-md">
                        {card.brand.name}
                      </span>
                      <CardTitle className="text-3xl leading-none font-black tracking-tight text-white drop-shadow-lg">
                        ${card.amount.toFixed(2)}
                      </CardTitle>
                    </div>
                    {!card.brand.image && <span className="text-4xl leading-none text-white/50">{card.brand.icon}</span>}
                  </div>
                </div>
              </div>

              {/* BOTTOM HALF: Code & Details */}
              <CardContent className="bg-card flex flex-1 flex-col items-center justify-center">
                <div className="flex w-full justify-center">
                  <ClaimCodeField code={card.claimCode} variant="visible" showCopyButton={true} />
                </div>
              </CardContent>

              {card.buyer && (
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
              )}
            </Card>
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
