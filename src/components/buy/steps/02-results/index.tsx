'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getBrandById } from '@/actions/catalog/get-brand-by-id';
import { createOrder } from '@/actions/buyer/orders/create-order';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { getOrderCards } from '@/actions/buyer/giftcards/get-order-cards';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { Brand } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { showAlert } from '@/lib/ui';
import { BuyStepsProgress } from '../shared/buy-steps-progress';

export const ResultsStep = () => {
  const {
    foundGiftcards,
    removeGiftcard,
    setStep,
    selectedBrand,
    selectedCountry,
    selectedCurrency,
    targetAmount,
    setOrderId,
    setFoundGiftcards,
    tierInfo,
  } = useBuyFlow();
  const [resultsState, setResultsState] = useState<{
    brandData: Brand | null;
    buyRate: number;
    isConfirming: boolean;
    showConfirmDialog: boolean;
  }>({
    brandData: null,
    buyRate: 0,
    isConfirming: false,
    showConfirmDialog: false,
  });

  const { execute: executeGetBrandById } = useAction(getBrandById, {
    onSuccess: ({ data }) => {
      if (data?.success && data.brand) {
        setResultsState((prev) => ({ ...prev, brandData: data.brand }));
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al obtener la marca');
    },
  });

  const { execute: executeGetUserBuyRate } = useAction(getUserBuyRate, {
    onSuccess: ({ data }) => {
      if (data?.success && typeof data.rate === 'number') {
        setResultsState((prev) => ({ ...prev, buyRate: data.rate }));
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al obtener la tasa de compra');
    },
  });

  const { execute: executeGetOrderCards } = useAction(getOrderCards, {
    onSuccess: ({ data }) => {
      if (data?.success && data.giftcards) {
        setFoundGiftcards(data.giftcards);
        setStep(3);
      } else {
        showAlert.error('Error', 'No se pudieron obtener las tarjetas de la orden');
      }
      setResultsState((prev) => ({
        ...prev,
        isConfirming: false,
        showConfirmDialog: false,
      }));
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al obtener las tarjetas de la orden');
      setResultsState((prev) => ({
        ...prev,
        isConfirming: false,
        showConfirmDialog: false,
      }));
    },
  });

  useEffect(() => {
    if (selectedBrand) {
      const brandId = selectedBrand.split('|')[0];
      executeGetBrandById({ id: brandId });
    }
    executeGetUserBuyRate({ brandId: selectedBrand.split('|')[0], countryId: selectedCountry });
  }, [selectedBrand, selectedCountry, executeGetBrandById, executeGetUserBuyRate]);

  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const { execute: createOrderExecute, status: createOrderStatus } = useAction(createOrder, {
    onSuccess: ({ data }) => {
      if (data?.success && data.orderId) {
        setOrderId(data.orderId);
        // Fetch cards WITH claimCodes now that the order is locked in
        executeGetOrderCards({ orderId: data.orderId });
      }
    },
    onError: ({ error }) => {
      showAlert.toast.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al crear la orden');
      setResultsState((prev) => ({ ...prev, isConfirming: false }));
    },
  });

  const handlePlaceOrder = () => {
    setResultsState((prev) => ({ ...prev, isConfirming: true }));
    const cardIds = foundGiftcards.map((c) => c.id);
    createOrderExecute({ giftcardIds: cardIds, idempotencyKey: idempotencyKeyRef.current });
  };

  const rawTotal = useMemo(() => foundGiftcards.reduce((sum, card) => sum + card.amount, 0), [foundGiftcards]);
  const discountedTotal = useMemo(() => rawTotal * resultsState.buyRate, [rawTotal, resultsState.buyRate]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      {/* Compact Summary Bar - solo info crítica en mobile */}
      <div className="flex min-h-0 shrink-0 flex-col gap-1 md:grid md:grid-cols-12 md:gap-1">
        {/* Info bar - izquierda en desktop */}
        <div className="border-border bg-muted/20 flex items-center justify-between gap-1 rounded-lg border p-2 md:col-span-4 md:flex-col md:items-start md:gap-1">
          <span className="text-muted-foreground text-xs">
            <span className="font-semibold">Monto objetivo:</span>
          </span>
          <span className="text-lg font-black md:text-xl">{formatCurrency(Number(targetAmount), { currency: selectedCurrency })}</span>
          {tierInfo && Number(tierInfo.inaccessibleAmount) > 0 && (
            <span className="text-muted-foreground text-[10px] md:text-xs">
              <span className="font-semibold">No disp:</span>{' '}
              {formatCurrency(Number(tierInfo.inaccessibleAmount), { currency: selectedCurrency })}
            </span>
          )}
        </div>

        {/* Resumen compactado - derecha en desktop */}
        <div className="grid grid-cols-3 gap-1 md:col-span-8">
          <div className="flex flex-col justify-center rounded-lg border border-slate-500/20 bg-slate-800/30 p-1.5">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Monto Encontrado</span>
            <p className="text-base font-black text-white">{formatCurrency(rawTotal, { currency: selectedCurrency })}</p>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5">
            <span className="text-[9px] font-medium tracking-wider text-emerald-400 uppercase">A Pagar</span>
            <p className="text-base font-black text-emerald-400">{formatCurrency(discountedTotal, { currency: 'USD' })}</p>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5">
            <span className="text-[9px] font-medium tracking-wider text-emerald-400 uppercase">Tasa</span>
            <p className="text-base font-black text-emerald-400">{(resultsState.buyRate * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Right Column: Cards List */}
      <Card className="flex min-h-0 flex-1 flex-col gap-0 border px-1 backdrop-blur-sm">
        <CardHeader className="flex items-center justify-between px-2 py-2 md:px-3 md:py-2">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase md:text-xs">
            Combinación Encontrada
          </span>
          <span className="text-muted-foreground/50 text-[10px] md:text-xs">{foundGiftcards.length} ítems</span>
        </CardHeader>

        <CardContent className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 py-1 md:space-y-1 md:px-2 md:py-2">
          {foundGiftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border px-2 py-1.5 transition-all md:px-3 md:py-2"
            >
              <div className="relative z-10 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 md:gap-1">
                  <div className="bg-card relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-sm md:h-12 md:w-12">
                    {resultsState.brandData?.image ? (
                      <Image
                        src={resultsState.brandData.image}
                        alt={resultsState.brandData.name}
                        fill
                        className="object-contain p-1"
                        loading="eager"
                      />
                    ) : (
                      resultsState.brandData?.icon
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-[9px] tracking-wider uppercase md:text-xs">Valor Nominal</span>
                    <div className="text-foreground text-base leading-none font-black md:text-xl">
                      {formatCurrency(card.amount, { currency: selectedCurrency })}
                    </div>
                    <div className="text-muted-foreground/50 font-mono text-[8px] tracking-wider uppercase md:text-[10px]">
                      ···· ···· ···· ····
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeGiftcard(card.id)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 shrink-0 rounded-lg md:h-9 md:w-9"
                >
                  <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </div>

              <div className="bg-primary/5 absolute top-0 right-0 -mt-6 -mr-6 h-12 w-12 rounded-full transition-transform duration-500 group-hover:scale-150" />
            </motion.div>
          ))}

          {foundGiftcards.length === 0 && (
            <div className="border-border bg-muted/20 col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 px-8 text-center">
              <div className="bg-muted rounded-full p-2">
                <Trash2 className="text-muted-foreground/50 h-6 w-6" />
              </div>
              <h3 className="mb-1 text-base font-bold md:text-lg">No hay tarjetas disponibles</h3>
              <p className="text-muted-foreground mx-auto max-w-xs text-xs md:text-sm">Reintentalo más tarde.</p>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-primary/50 text-primary hover:bg-primary/10 mt-2 text-xs md:text-sm"
              >
                Volver a Buscar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center-safe gap-1">
        <Button
          onClick={() => setStep(1)}
          variant="outline"
          className="border-border text-muted-foreground hover:bg-muted h-9 flex-1 text-xs font-bold md:h-10 md:text-sm"
        >
          Ajustar
        </Button>
        <Button
          onClick={() => setResultsState((prev) => ({ ...prev, showConfirmDialog: true }))}
          disabled={foundGiftcards.length === 0 || resultsState.buyRate === 0 || createOrderStatus === 'executing'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 flex-1 text-xs font-bold md:h-10 md:text-sm"
        >
          Realizar Pedido <ChevronRight className="ml-1 h-3 w-3 md:ml-2 md:h-4 md:w-4" />
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={resultsState.showConfirmDialog}
        onOpenChange={(open) => setResultsState((prev) => ({ ...prev, showConfirmDialog: open }))}
      >
        <AlertDialogContent className="border-border bg-card sm:min-w-112.5">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Realizar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Nota: Proceso irreversible. Una vez revelados los códigos, asumes la propiedad, aplicación y pago de los mismos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resultsState.isConfirming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePlaceOrder();
              }}
              disabled={createOrderStatus === 'executing'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {resultsState.isConfirming ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creando Pedido...
                </>
              ) : (
                'Confirmar y Revelar Códigos'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
