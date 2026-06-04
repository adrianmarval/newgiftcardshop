'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, XCircle, Ban, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { confirmUsage } from '@/actions/buyer/orders/confirm-usage';
import { cancelOrder } from '@/actions/buyer/orders/cancel-order';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/lib/swal';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/currency-formatter';
import { BuyStepsProgress } from '@/components/buy/steps/buy-steps-progress';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export const ConfirmUsageStep = () => {
  const { foundGiftcards, setStep, orderId, setAdjustedTotal, resetForm, selectedBrand, selectedCountry } = useBuyFlow();
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(0.85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { execute: executeGetUserBuyRate } = useAction(getUserBuyRate, {
    onSuccess: ({ data }) => {
      if (data?.success && typeof data.rate === 'number') {
        setBuyRate(data.rate);
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al obtener la tasa de compra');
    },
  });

  useEffect(() => {
    executeGetUserBuyRate({ brandId: selectedBrand, countryId: selectedCountry });
  }, [executeGetUserBuyRate, selectedBrand, selectedCountry]);

  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum + card.amount;
    if (card.status === 'WRONG_AMOUNT') return sum + (card.reportedAmount ?? 0);
    return sum;
  }, 0);

  const totalAmount = rawTotal * buyRate;

  const { execute: confirmExecute, status: confirmStatus } = useAction(confirmUsage, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (typeof data.adjustedTotal === 'number') {
          setAdjustedTotal(data.adjustedTotal);
        }
        setStep(5);
      }
    },
    onError: ({ error }) => {
      const errorDescription = error.serverError || error.validationErrors?._errors?.[0] || 'Error al confirmar uso de tarjetas';
      showAlert.error('Error', errorDescription);
      setErrorMessage(errorDescription);
    },
  });

  const handleConfirmUsage = () => {
    if (!orderId) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmDialogConfirm = () => {
    if (!orderId) return;
    setShowConfirmDialog(false);
    setErrorMessage(null);
    confirmExecute({ orderId });
  };

  const { execute: cancelExecute, status: cancelStatus } = useAction(cancelOrder, {
    onSuccess: () => {
      showAlert.toast.success('Orden cancelada con éxito');
      resetForm();
      router.push('/store/dashboard/orders');
    },
    onError: ({ error }) => {
      const errorDescription = error.serverError || error.validationErrors?._errors?.[0] || 'Error al cancelar la orden';
      showAlert.error('Error', errorDescription);
      setErrorMessage(errorDescription);
    },
  });

  const handleCancelOrder = () => {
    if (!orderId) return;
    setErrorMessage(null);
    cancelExecute({ orderId });
  };

  const allCardsWorthless = totalAmount === 0 && foundGiftcards.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      <Card className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 border p-3 text-center backdrop-blur-sm md:gap-6 md:p-6">
        <div className="max-w-xl space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full md:mb-4 md:h-16 md:w-16 ${allCardsWorthless ? 'bg-destructive/10' : 'bg-primary/10'}`}
          >
            {allCardsWorthless ? (
              <Ban className="text-destructive h-6 w-6 md:h-8 md:w-8" />
            ) : (
              <Check className="text-primary h-6 w-6 md:h-8 md:w-8" />
            )}
          </motion.div>

          <h2 className="text-xl font-black tracking-tight uppercase italic md:text-3xl">
            {allCardsWorthless ? 'ORDEN SIN VALOR' : '¿HAS REDIMIDO TODO?'}
          </h2>
          <p className="text-muted-foreground text-xs md:text-base">
            {allCardsWorthless
              ? 'Todas las tarjetas fueron reportadas con problemas. No hay saldo para procesar.'
              : 'Confirma que has redimido exitosamente los fondos en tu cuenta antes de pagar.'}
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2 md:gap-4">
          <div className="border-border bg-muted/50 rounded-xl border p-2 md:p-3">
            <div className="text-muted-foreground mb-0.5 text-[9px] font-black uppercase md:text-xs">Tarjetas</div>
            <div className="text-lg font-black md:text-2xl">{foundGiftcards.length}</div>
          </div>
          <div
            className={`rounded-xl border p-2 md:p-3 ${allCardsWorthless ? 'border-destructive/20 bg-destructive/10' : 'border-primary/20 bg-primary/10'}`}
          >
            <div className={`mb-0.5 text-[9px] font-black uppercase md:text-xs ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}>
              Total a Pagar
            </div>
            <div className={`text-lg font-black md:text-2xl ${allCardsWorthless ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(totalAmount, { currency: 'USD' })}
            </div>
          </div>
        </div>

        {allCardsWorthless ? (
          <div className="flex w-full max-w-md gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 text-left md:p-3">
            <XCircle className="mt-0.5 h-3.5 w-3.5 text-amber-500 md:h-4 md:w-4" />
            <p className="text-muted-foreground text-[10px] leading-relaxed italic md:text-sm">
              Todas las tarjetas han sido reportadas. Puedes cancelar esta orden o volver para revisar tus reportes.
            </p>
          </div>
        ) : (
          <div className="border-primary/20 bg-primary/5 flex w-full max-w-md gap-2 rounded-xl border p-2 text-left md:p-3">
            <Info className="text-primary mt-0.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            <p className="text-muted-foreground text-xs leading-relaxed italic md:text-sm">
              La confirmación es irreversible. Asegúrate de haber redimido o reportado los códigos correctamente.
            </p>
          </div>
        )}

        {errorMessage && <p className="text-destructive text-xs font-medium md:text-sm">{errorMessage}</p>}
      </Card>

      <div className="flex items-center justify-center-safe gap-2">
        <Button
          variant="ghost"
          onClick={() => setStep(3)}
          className="text-muted-foreground hover:bg-muted h-9 text-xs font-bold md:h-10 md:text-sm"
          disabled={confirmStatus === 'executing' || cancelStatus === 'executing'}
        >
          <ArrowLeft className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" /> Volver
        </Button>

        {allCardsWorthless ? (
          <Button
            variant={'destructive'}
            onClick={handleCancelOrder}
            disabled={cancelStatus === 'executing' || !orderId}
            className="h-9 text-xs md:h-10 md:text-sm"
          >
            {cancelStatus === 'executing' ? <Spinner size="sm" /> : 'Cancelar Orden'}
          </Button>
        ) : (
          <Button
            onClick={handleConfirmUsage}
            disabled={confirmStatus === 'executing' || !orderId}
            className="bg-primary text-primary-foreground h-9 text-xs font-bold md:h-10 md:text-sm"
          >
            {confirmStatus === 'executing' ? <Spinner size="sm" /> : 'Confirmar y Pagar'}
          </Button>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Liberar Pago al Proveedor?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              ¿Ya redimiste y reportaste correctamente todas tus tarjetas?
              <br />
              <span className="text-destructive mt-2 block font-medium">El pago no se puede revertir.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setStep(3);
              }}
              className="flex-1"
            >
              Seguir Reportando
            </Button>
            <AlertDialogAction onClick={handleConfirmDialogConfirm} disabled={confirmStatus === 'executing'} className="flex-1">
              {confirmStatus === 'executing' ? <Spinner size="sm" className="mr-2" /> : null}
              Confirmar y Pagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
