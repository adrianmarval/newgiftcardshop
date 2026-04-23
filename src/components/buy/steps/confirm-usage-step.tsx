'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ArrowLeft, XCircle, Ban, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate, confirmOrderUsage, cancelOrder } from '@/actions/order';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export const ConfirmUsageStep = () => {
  const { foundGiftcards, setStep, orderId, setAdjustedTotal, resetForm } = useBuyFlow();
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(0.85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { execute: executeGetUserBuyRate } = useAction(getUserBuyRate, {
    onSuccess: ({ data }) => {
      if (data?.success && typeof data.rate === 'number') {
        setBuyRate(data.rate);
      }
    },
    onError: ({ error }) => {
      toast.error('Error al obtener la tasa de compra', {
        description: error.serverError || error.validationErrors?.formErrors?.[0],
      });
    },
  });

  useEffect(() => {
    executeGetUserBuyRate();
  }, [executeGetUserBuyRate]);

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
      <Card className="border-border bg-card/50 flex flex-col items-center space-y-4 p-4 text-center backdrop-blur-sm md:col-span-12 md:space-y-6 md:p-8">
        <div className="max-w-2xl space-y-2 md:space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full md:mb-4 md:h-20 md:w-20 ${allCardsWorthless ? 'bg-destructive/10' : 'bg-primary/10'}`}
          >
            {allCardsWorthless ? (
              <Ban className="text-destructive h-8 w-8 md:h-10 md:w-10" />
            ) : (
              <Check className="text-primary h-8 w-8 md:h-10 md:w-10" />
            )}
          </motion.div>

          <h2 className="text-2xl font-black tracking-tight uppercase italic md:text-4xl">
            {allCardsWorthless ? 'ORDEN SIN VALOR' : '¿HAS REDIMIDO TODO?'}
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg">
            {allCardsWorthless
              ? 'Todas las tarjetas fueron reportadas con problemas. No hay saldo para procesar.'
              : 'Confirma que has redimido exitosamente los fondos en tu cuenta antes de pagar.'}
          </p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-2 md:gap-4">
          <div className="border-border bg-muted/50 rounded-xl border p-2 md:p-4">
            <div className="text-muted-foreground mb-0.5 text-[10px] font-black uppercase md:text-xs">Tarjetas</div>
            <div className="text-xl font-black md:text-3xl">{foundGiftcards.length}</div>
          </div>
          <div
            className={`rounded-xl border p-2 md:p-4 ${allCardsWorthless ? 'border-destructive/20 bg-destructive/10' : 'border-primary/20 bg-primary/10'}`}
          >
            <div
              className={`mb-0.5 text-[10px] font-black uppercase md:text-xs ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}
            >
              Total a Pagar
            </div>
            <div className={`text-xl font-black md:text-3xl ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}>
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {allCardsWorthless ? (
          <div className="flex w-full max-w-lg gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left md:p-4">
            <XCircle className="mt-0.5 h-4 w-4 text-amber-500 md:h-5 md:w-5" />
            <p className="text-muted-foreground text-[10px] leading-relaxed italic md:text-sm">
              Todas las tarjetas han sido reportadas. Puedes cancelar esta orden o volver para revisar tus reportes.
            </p>
          </div>
        ) : (
          <div className="border-primary/20 bg-primary/5 flex w-full max-w-lg gap-3 rounded-xl border p-3 text-left md:p-4">
            <Info className="text-primary mt-0.5 h-4 w-4 md:h-5 md:w-5" />
            <p className="text-muted-foreground text-[10px] leading-relaxed italic md:text-sm">
              La confirmación es irreversible. Asegúrate de haber redimido los códigos correctamente.
            </p>
          </div>
        )}

        {errorMessage && <p className="text-destructive text-xs font-medium md:text-sm">{errorMessage}</p>}

        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row md:gap-4">
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            className="text-muted-foreground hover:bg-muted h-10 flex-1 text-xs font-bold md:h-12 md:text-sm"
            disabled={confirmStatus === 'executing' || cancelStatus === 'executing'}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" /> Volver
          </Button>

          {allCardsWorthless ? (
            <Button
              onClick={handleCancelOrder}
              disabled={cancelStatus === 'executing' || !orderId}
              className="bg-destructive text-destructive-foreground shadow-destructive/30 hover:bg-destructive/90 h-10 flex-2 text-xs font-bold shadow-xl md:h-12 md:text-base"
            >
              {cancelStatus === 'executing' ? <Spinner size="sm" /> : 'Cancelar Orden'}
            </Button>
          ) : (
            <Button onClick={handleConfirmUsage} disabled={confirmStatus === 'executing' || !orderId}>
              {confirmStatus === 'executing' ? <Spinner size="sm" /> : 'Confirmar y Pagar'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
