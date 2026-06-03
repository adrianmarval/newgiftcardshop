'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { formatCurrency } from '@/lib/currency-formatter';
import { showAlert } from '@/lib/swal';

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

  const { execute: createOrderExecute, status: createOrderStatus } = useAction(createOrder, {
    onSuccess: ({ data }) => {
      if (data?.success && data.orderId) {
        setOrderId(data.orderId);
        // Fetch cards WITH claimCodes now that the order is locked in
        executeGetOrderCards({ orderId: data.orderId });
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || 'Error al crear la orden');
      setResultsState((prev) => ({ ...prev, isConfirming: false }));
    },
  });

  const handlePlaceOrder = () => {
    setResultsState((prev) => ({ ...prev, isConfirming: true }));
    const cardIds = foundGiftcards.map((c) => c.id);
    createOrderExecute({ giftcardIds: cardIds });
  };

  const rawTotal = foundGiftcards.reduce((sum, card) => sum + card.amount, 0);
  const discountedTotal = rawTotal * resultsState.buyRate;

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-4">
      {/* Left Column: Selection Summary */}
      <Card className="col-span-12 flex h-full flex-col md:col-span-4">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Selección</CardTitle>
          <CardDescription>Revisa las tarjetas de regalo propuestas.</CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <Card className="gap-0 p-0" size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Objetivo</span>
                <span className="font-bold">{formatCurrency(Number(targetAmount), { currency: selectedCurrency })}</span>
              </div>
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Tarjetas</span>
                <span className="font-bold">{foundGiftcards.length} ítems</span>
              </div>
              <div className="border-border/50 flex items-center justify-between border-t border-dashed pt-2 text-xs md:text-sm">
                <span className="font-semibold">Disponible</span>
                <span className="text-lg font-bold md:text-xl">{formatCurrency(rawTotal, { currency: selectedCurrency })}</span>
              </div>
              <div className="border-border flex items-center justify-between border-t pt-2 text-xs md:text-sm">
                <span className="text-primary">Total a Pagar</span>
                <div className="text-right">
                  <span className="text-primary text-xl font-black md:text-2xl">
                    {formatCurrency(discountedTotal, { currency: 'USD' })}
                  </span>
                  <p className="text-muted-foreground mt-0.5 text-[10px] leading-none md:text-xs">
                    Tasa: {(resultsState.buyRate * 100).toFixed(1)}% · Ahorrás{' '}
                    {formatCurrency(rawTotal - discountedTotal, { currency: selectedCurrency })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-2 p-3">
              <Info className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-muted-foreground text-[10px] leading-relaxed md:text-sm">
                Los códigos se revelarán en el siguiente paso. Puedes eliminar las tarjetas que no quieras de la lista de la derecha.
              </p>
            </CardContent>
          </Card>

          {tierInfo && (
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tu Tarifa</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs md:text-sm">Tu tasa</span>
                  <span className="text-primary text-sm font-bold md:text-base">{tierInfo.buyerBuyRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs md:text-sm">Monto disponible</span>
                  <span className="text-sm font-bold text-green-500 md:text-base">
                    {formatCurrency(Number(tierInfo.accessibleAmount), { currency: selectedCurrency })}
                  </span>
                </div>
                {Number(tierInfo.inaccessibleAmount) > 0 && (
                  <div className="border-border/50 mt-2 flex items-center justify-between border-t border-dashed pt-2">
                    <span className="text-muted-foreground text-xs md:text-sm">No disponible aún</span>
                    <span className="text-muted-foreground text-xs md:text-sm">
                      {formatCurrency(Number(tierInfo.inaccessibleAmount), { currency: selectedCurrency })}
                    </span>
                  </div>
                )}
                <p className="text-muted-foreground text-[10px] leading-tight md:text-xs">
                  Las tarjetas con tasa mayor a {tierInfo.buyerBuyRate}% no están disponibles para ti actualmente.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      {/* Right Column: Cards List */}
      <Card className="flex h-full flex-col px-2 backdrop-blur-sm md:col-span-8 md:px-1">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm">
            Combinación Encontrada
          </CardTitle>

          <span className="text-muted-foreground/50 text-xs">{foundGiftcards.length} ítems</span>
        </CardHeader>

        <CardContent className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-0 sm:px-1">
          {foundGiftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border px-3 py-1 transition-all"
            >
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="bg-card relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-sm md:h-14 md:w-14">
                    {resultsState.brandData?.image ? (
                      <Image
                        src={resultsState.brandData.image}
                        alt={resultsState.brandData.name}
                        fill
                        className="object-contain p-1.5"
                        loading="eager"
                      />
                    ) : (
                      resultsState.brandData?.icon
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase md:text-xs">Valor Nominal</span>
                    <div className="text-foreground text-xl leading-none font-black md:text-2xl">
                      {formatCurrency(card.amount, { currency: selectedCurrency })}
                    </div>
                    <div className="text-muted-foreground/50 mt-0.5 font-mono text-[9px] tracking-wider uppercase md:text-xs">
                      ···· ···· ···· ···· {/* show as masked placeholder for card code */}
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeGiftcard(card.id)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10"
                >
                  <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>

              <div className="bg-primary/5 absolute top-0 right-0 -mt-8 -mr-8 h-16 w-16 rounded-full transition-transform duration-500 group-hover:scale-150" />
            </motion.div>
          ))}

          {foundGiftcards.length === 0 && (
            <div className="border-border bg-muted/20 col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 px-12 text-center">
              <div className="bg-muted rounded-full">
                <Trash2 className="text-muted-foreground/50 h-8 w-8" />
              </div>
              <h3 className="mb-1 text-xl font-bold">No hay tarjetas disponibles</h3>
              <p className="text-muted-foreground mx-auto max-w-xs text-base">Reintentalo más tarde.</p>
              <Button variant="outline" onClick={() => setStep(1)} className="border-primary/50 text-primary hover:bg-primary/10">
                Volver a Buscar
              </Button>
            </div>
          )}
        </CardContent>

        <div className="mt-2 flex gap-2">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted h-10 flex-1 text-xs md:h-11 md:text-sm"
          >
            Ajustar
          </Button>
          <Button
            onClick={() => setResultsState((prev) => ({ ...prev, showConfirmDialog: true }))}
            disabled={foundGiftcards.length === 0 || resultsState.buyRate === 0 || createOrderStatus === 'executing'}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 flex-2 text-xs font-bold shadow-lg md:h-11 md:text-sm"
          >
            Realizar Pedido <ChevronRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={resultsState.showConfirmDialog}
        onOpenChange={(open) => setResultsState((prev) => ({ ...prev, showConfirmDialog: open }))}
      >
        <AlertDialogContent className="border-border bg-card sm:min-w-112.5">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Realizar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              El proceso no se puede revertir porque los códigos serán revelados. Una vez revelados, se consideran tuyos y debes aplicarlos
              y pagarlos.
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
