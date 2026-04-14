'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ChevronRight, Info, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { getBrandById } from '@/actions/brand-actions';
import { createOrder, getUserBuyRate } from '@/actions/order-actions';
import { getOrderCards } from '@/actions/buyer-actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { Brand } from '@/types';
import { toast } from 'sonner';

export function ResultsStep() {
  const { foundGiftcards, removeGiftcard, setStep, selectedBrand, targetAmount, setOrderId, setFoundGiftcards } = useBuyFlow();
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

  useEffect(() => {
    if (selectedBrand) {
      getBrandById({ id: selectedBrand }).then((result) => {
        if (result.data?.success && result.data.brand) {
          const brand = result.data.brand;
          setResultsState((prev) => ({ ...prev, brandData: brand }));
        } else if (result.serverError || result.validationErrors) {
          toast.error('Error al obtener la marca', {
            description: result.serverError || result.validationErrors?._errors?.[0],
          });
        }
      });
    }
    getUserBuyRate().then((result) => {
      if (result.data?.success && typeof result.data.rate === 'number') {
        const rate = result.data.rate;
        setResultsState((prev) => ({ ...prev, buyRate: rate }));
      } else if (result.serverError || result.validationErrors) {
        toast.error('Error al obtener la tasa de compra', {
          description: result.serverError || result.validationErrors?.formErrors?.[0],
        });
      }
    });
  }, [selectedBrand]);

  const { execute: createOrderExecute, status: createOrderStatus } = useAction(createOrder, {
    onSuccess: ({ data }) => {
      if (data?.success && data.orderId) {
        setOrderId(data.orderId);
        // Fetch cards WITH claimCodes now that the order is locked in
        getOrderCards({ orderId: data.orderId }).then((orderCardsResult) => {
          if (orderCardsResult.data?.success && orderCardsResult.data.giftcards) {
            setFoundGiftcards(orderCardsResult.data.giftcards);
            setStep(3);
          } else if (orderCardsResult.serverError || orderCardsResult.validationErrors) {
            toast.error('Error al obtener las tarjetas de la orden', {
              description: orderCardsResult.serverError || orderCardsResult.validationErrors?._errors?.[0],
            });
          }
          setResultsState((prev) => ({
            ...prev,
            isConfirming: false,
            showConfirmDialog: false,
          }));
        });
      }
    },
    onError: ({ error }) => {
      toast.error('Error al crear la orden', {
        description: error.serverError || error.validationErrors?._errors?.[0],
      });
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
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Selection Summary */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-4 p-4 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Selección</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Revisa las tarjetas de regalo propuestas.</p>
        </div>

        <div className="space-y-4">
          <div className="border-border bg-muted/50 space-y-3 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Objetivo de Búsqueda</span>
              <span className="font-bold">${targetAmount}</span>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Tarjetas Encontradas</span>
              <span className="font-bold">{foundGiftcards.length} ítems</span>
            </div>
            <div className="border-border flex items-center justify-between border-t pt-2 text-sm md:text-base">
              <span className="text-muted-foreground">Total a Pagar</span>
              <div className="text-right">
                <span className="text-primary text-2xl font-black">${discountedTotal.toFixed(2)}</span>
                <p className="text-muted-foreground mt-1 text-xs leading-none">
                  {resultsState.buyRate < 1 ? `Tasa: ${resultsState.buyRate * 100}%` : 'Valor de la orden'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-3">
            <Info className="text-primary mt-0.5 h-4 w-4" />
            <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
              Los códigos se revelarán en el siguiente paso. Puedes eliminar las tarjetas que no quieras de la lista de la derecha.
            </p>
          </div>
        </div>

        <div className="border-border mt-auto flex gap-3 border-t pt-4 md:pt-6">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted h-10 flex-1 md:h-11"
          >
            Ajustar
          </Button>
          <Button
            onClick={() => setResultsState((prev) => ({ ...prev, showConfirmDialog: true }))}
            disabled={foundGiftcards.length === 0 || resultsState.buyRate === 0 || createOrderStatus === 'executing'}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 flex-2 font-bold shadow-lg md:h-11"
          >
            Realizar Pedido <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Right Column: Cards List */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-4 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm">Paquete Propuesto</Label>
          <span className="text-muted-foreground/50 text-xs">{foundGiftcards.length} ítems</span>
        </div>

        <div className="custom-scrollbar grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 md:gap-4">
          {foundGiftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group border-border bg-muted/20 hover:border-primary/30 relative overflow-hidden rounded-xl border p-3 transition-all md:p-4"
            >
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="border-border bg-card relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border text-xl shadow-sm">
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
                  <div>
                    <div className="text-foreground text-xl font-black">${card.amount}</div>
                    <div className="text-muted-foreground/50 font-mono text-xs tracking-tighter whitespace-nowrap uppercase">
                      CÓDIGO: XXXX-XXXX-XXXX
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeGiftcard(card.id)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-primary/5 absolute top-0 right-0 -mt-6 -mr-6 h-12 w-12 rounded-full transition-transform duration-500 group-hover:scale-150" />
            </motion.div>
          ))}

          {foundGiftcards.length === 0 && (
            <div className="border-border bg-muted/20 col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center">
              <div className="bg-muted mb-4 rounded-full p-4">
                <Trash2 className="text-muted-foreground/50 h-8 w-8" />
              </div>
              <h3 className="mb-1 text-xl font-bold">El paquete está vacío</h3>
              <p className="text-muted-foreground mx-auto max-w-xs text-base">
                Vuelve a la búsqueda o ajusta tus criterios para encontrar más tarjetas.
              </p>
              <Button variant="outline" onClick={() => setStep(1)} className="border-primary/50 text-primary hover:bg-primary/10 mt-6">
                Volver a Buscar
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={resultsState.showConfirmDialog}
        onOpenChange={(open) => setResultsState((prev) => ({ ...prev, showConfirmDialog: open }))}
      >
        <AlertDialogContent className="border-border bg-card sm:min-w-[450px]">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
}
