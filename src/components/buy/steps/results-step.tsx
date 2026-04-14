"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, ChevronRight, Info, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { getBrandById } from "@/actions/brand-actions";
import { createOrder, getUserBuyRate } from "@/actions/order-actions";
import { getOrderCards } from "@/actions/buyer-actions";
import { useAction } from "next-safe-action/hooks";
import Image from "next/image";
import type { Brand } from "@/types";
import { toast } from "sonner";

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
          toast.error("Error al obtener la marca", { description: result.serverError || result.validationErrors?._errors?.[0] });
        }
      });
    }
    getUserBuyRate().then((result) => {
      if (result.data?.success && typeof result.data.rate === "number") {
        const rate = result.data.rate;
        setResultsState((prev) => ({ ...prev, buyRate: rate }));
      } else if (result.serverError || result.validationErrors) {
        toast.error("Error al obtener la tasa de compra", { description: result.serverError || result.validationErrors?.formErrors?.[0] });
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
            toast.error("Error al obtener las tarjetas de la orden", {
              description: orderCardsResult.serverError || orderCardsResult.validationErrors?._errors?.[0],
            });
          }
          setResultsState((prev) => ({ ...prev, isConfirming: false, showConfirmDialog: false }));
        });
      }
    },
    onError: ({ error }) => {
      toast.error("Error al crear la orden", {
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Selection Summary */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1">Selección</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Revisa las tarjetas de regalo propuestas.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-xl p-3 md:p-4 space-y-3">
            <div className="flex justify-between items-center text-sm md:text-base">
              <span className="text-muted-foreground">Objetivo de Búsqueda</span>
              <span className="font-bold">${targetAmount}</span>
            </div>
            <div className="flex justify-between items-center text-sm md:text-base">
              <span className="text-muted-foreground">Tarjetas Encontradas</span>
              <span className="font-bold">{foundGiftcards.length} ítems</span>
            </div>
            <div className="flex justify-between items-center text-sm md:text-base pt-2 border-t border-border">
              <span className="text-muted-foreground">Total a Pagar</span>
              <div className="text-right">
                <span className="text-2xl font-black text-primary">${discountedTotal.toFixed(2)}</span>
                <p className="text-xs text-muted-foreground leading-none mt-1">
                  {resultsState.buyRate < 1 ? `Tasa: ${resultsState.buyRate * 100}%` : "Valor de la orden"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 items-start">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Los códigos se revelarán en el siguiente paso. Puedes eliminar las tarjetas que no quieras de la lista de la derecha.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-border flex gap-3">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:bg-muted h-10 md:h-11"
          >
            Ajustar
          </Button>
          <Button
            onClick={() => setResultsState((prev) => ({ ...prev, showConfirmDialog: true }))}
            disabled={foundGiftcards.length === 0 || resultsState.buyRate === 0 || createOrderStatus === "executing"}
            className="flex-2 bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 font-bold shadow-lg shadow-primary/20"
          >
            Realizar Pedido <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>

      {/* Right Column: Cards List */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 flex flex-col min-h-100 md:min-h-125">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider">Paquete Propuesto</Label>
          <span className="text-xs text-muted-foreground/50">{foundGiftcards.length} ítems</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {foundGiftcards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 md:p-4 rounded-xl border border-border bg-muted/20 relative overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-xl shadow-sm relative overflow-hidden">
                    {resultsState.brandData?.image ? (
                      <Image
                        src={resultsState.brandData.image}
                        alt={resultsState.brandData.name}
                        fill
                        className="p-1 object-contain"
                        loading="eager"
                      />
                    ) : (
                      resultsState.brandData?.icon
                    )}
                  </div>
                  <div>
                    <div className="text-xl font-black text-foreground">${card.amount}</div>
                    <div className="text-xs font-mono text-muted-foreground/50 tracking-tighter uppercase whitespace-nowrap">
                      CÓDIGO: XXXX-XXXX-XXXX
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeGiftcard(card.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150 duration-500" />
            </motion.div>
          ))}

          {foundGiftcards.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Trash2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold mb-1">El paquete está vacío</h3>
              <p className="text-muted-foreground text-base max-w-xs mx-auto">
                Vuelve a la búsqueda o ajusta tus criterios para encontrar más tarjetas.
              </p>
              <Button variant="outline" onClick={() => setStep(1)} className="mt-6 border-primary/50 text-primary hover:bg-primary/10">
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
        <AlertDialogContent className="bg-card border-border sm:min-w-[450px]">
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
              disabled={createOrderStatus === "executing"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {resultsState.isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creando Pedido...
                </>
              ) : (
                "Confirmar y Revelar Códigos"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
