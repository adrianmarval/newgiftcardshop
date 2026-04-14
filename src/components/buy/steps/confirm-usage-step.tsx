'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ArrowLeft, Loader2, XCircle, Ban } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate, confirmOrderUsage, cancelOrder } from '@/actions/order-actions';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ConfirmUsageStep() {
  const { foundGiftcards, setStep, orderId, setAdjustedTotal, resetForm } = useBuyFlow();
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(0.85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getUserBuyRate().then((result) => {
      if (result.data?.success && typeof result.data.rate === 'number') {
        setBuyRate(result.data.rate);
      } else if (result.serverError || result.validationErrors) {
        toast.error('Error al obtener la tasa de compra', {
          description: result.serverError || result.validationErrors?.formErrors?.[0],
        });
      }
    });
  }, []);

  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum + card.amount;
    if (card.status === 'WRONG_AMOUNT') return sum + (card.reportedAmount ?? 0);
    return sum;
  }, 0);

  const totalAmount = rawTotal * buyRate;

  const { execute: confirmExecute, status: confirmStatus } = useAction(confirmOrderUsage, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (typeof data.adjustedTotal === 'number') {
          setAdjustedTotal(data.adjustedTotal);
        }
        setStep(5);
      }
    },
    onError: ({ error }) => {
      toast.error('Error al confirmar uso de tarjetas', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Error al confirmar uso de tarjetas',
      });
      setErrorMessage(error.serverError || error.validationErrors?._errors?.join('') || 'Error al confirmar uso de tarjetas');
    },
  });

  const handleConfirmUsage = () => {
    if (!orderId) return;
    setErrorMessage(null);
    confirmExecute({ orderId });
  };

  const { execute: cancelExecute, status: cancelStatus } = useAction(cancelOrder, {
    onSuccess: () => {
      toast.success('Orden cancelada con éxito');
      resetForm();
      router.push('/buy/dashboard/orders');
    },
    onError: ({ error }) => {
      toast.error('Error al cancelar la orden', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Error al cancelar la orden',
      });
      setErrorMessage(error.serverError || 'Error al cancelar la orden');
    },
  });

  const handleCancelOrder = () => {
    if (!orderId) return;
    setErrorMessage(null);
    cancelExecute({ orderId });
  };

  const reportedCards = foundGiftcards.filter((c) => c.status !== 'UNUSED');
  const allCardsWorthless = totalAmount === 0 && foundGiftcards.length > 0;

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Full-width Confirmation Panel */}
      <Card className="border-border bg-card/50 flex flex-col items-center space-y-6 p-4 text-center backdrop-blur-sm md:col-span-12 md:space-y-8 md:p-8">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${allCardsWorthless ? 'bg-destructive/10' : 'bg-primary/10'}`}
          >
            {allCardsWorthless ? <Ban className="text-destructive h-10 w-10" /> : <Check className="text-primary h-10 w-10" />}
          </motion.div>

          {allCardsWorthless ? (
            <>
              <h2 className="text-3xl font-black tracking-tight italic md:text-4xl">TODAS LAS TARJETAS REPORTADAS</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Cada tarjeta en esta orden ha sido reportada como inválida. No hay <strong>nada que pagar</strong>. Puedes cancelar esta
                orden o volver para revisar tus reportes.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black tracking-tight italic md:text-4xl">CONFIRMACIÓN FINAL</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Estás a punto de confirmar que has usado todas las tarjetas correctamente. Una vez confirmado, procederás al pago y{' '}
                <strong>los reportes serán desactivados</strong>.
              </p>
            </>
          )}
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-border bg-muted/50 rounded-2xl border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-black uppercase">Total Tarjetas</div>
            <div className="text-3xl font-black">{foundGiftcards.length}</div>
          </div>
          <div className="border-border bg-muted/50 rounded-2xl border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-black uppercase">Problemas Reportados</div>
            <div className={`text-3xl font-black ${reportedCards.length > 0 ? 'text-destructive' : ''}`}>{reportedCards.length}</div>
          </div>
          <div
            className={`rounded-2xl p-4 ${allCardsWorthless ? 'border-destructive/20 bg-destructive/10 border' : 'border-primary/20 bg-primary/10 border'}`}
          >
            <div className={`mb-1 text-xs font-black uppercase ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}>
              Monto Final Adeudado
            </div>
            <div className={`text-3xl font-black ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}>
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {allCardsWorthless ? (
          <div className="flex w-full max-w-lg gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left">
            <XCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-500 uppercase">No quedan tarjetas válidas</p>
              <p className="text-muted-foreground text-sm leading-relaxed italic">
                Todas las tarjetas han sido reportadas como inválidas, ya usadas o desactivadas. Puedes cancelar esta orden sin costo, o
                volver para ajustar tus reportes si cometiste un error.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-destructive/20 bg-destructive/5 flex w-full max-w-lg gap-3 rounded-xl border p-4 text-left">
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="text-destructive text-sm font-bold uppercase">Aviso Importante</p>
              <p className="text-destructive/80 text-sm leading-relaxed italic">
                La confirmación es irreversible. Asegúrate de tener capturas de pantalla de la redención o evidencia en video para todas las
                tarjetas, especialmente aquellas que reportaste con problemas.
              </p>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-destructive text-sm font-medium">{errorMessage}</p>}

        <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            className="text-muted-foreground hover:bg-muted h-12 flex-1 text-sm font-bold"
            disabled={confirmStatus === 'executing' || cancelStatus === 'executing'}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Revisar
          </Button>

          {allCardsWorthless ? (
            <Button
              onClick={handleCancelOrder}
              disabled={cancelStatus === 'executing' || !orderId}
              className="bg-destructive text-destructive-foreground shadow-destructive/30 hover:bg-destructive/90 h-12 flex-2 text-base font-bold shadow-xl"
            >
              {cancelStatus === 'executing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar Orden
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmUsage}
              disabled={confirmStatus === 'executing' || !orderId}
              className="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 h-12 flex-2 text-base font-bold shadow-xl"
            >
              {confirmStatus === 'executing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...
                </>
              ) : (
                'Confirmar y Proceder al Pago'
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
