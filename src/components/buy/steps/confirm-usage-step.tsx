"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle, ArrowLeft, Loader2, XCircle, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { getUserBuyRate, confirmOrderUsage, cancelOrder } from "@/actions/order-actions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ConfirmUsageStep() {
  const { foundGiftcards, setStep, orderId, setAdjustedTotal, resetForm } = useBuyFlow();
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(0.85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getUserBuyRate().then((result) => {
      if (result.data?.success && typeof result.data.rate === "number") {
        setBuyRate(result.data.rate);
      } else if (result.serverError || result.validationErrors) {
        toast.error("Error al obtener la tasa de compra", { description: result.serverError || result.validationErrors?.formErrors?.[0] });
      }
    });
  }, []);

  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === "UNUSED") return sum + card.amount;
    if (card.status === "WRONG_AMOUNT") return sum + (card.reportedAmount ?? 0);
    return sum;
  }, 0);

  const totalAmount = rawTotal * buyRate;

  const { execute: confirmExecute, status: confirmStatus } = useAction(confirmOrderUsage, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (typeof data.adjustedTotal === "number") {
          setAdjustedTotal(data.adjustedTotal);
        }
        setStep(5);
      }
    },
    onError: ({ error }) => {
      toast.error("Error al confirmar uso de tarjetas", {
        description: error.serverError || error.validationErrors?._errors?.[0] || "Error al confirmar uso de tarjetas",
      });
      setErrorMessage(error.serverError || error.validationErrors?._errors?.join("") || "Error al confirmar uso de tarjetas");
    },
  });

  const handleConfirmUsage = () => {
    if (!orderId) return;
    setErrorMessage(null);
    confirmExecute({ orderId });
  };

  const { execute: cancelExecute, status: cancelStatus } = useAction(cancelOrder, {
    onSuccess: () => {
      toast.success("Orden cancelada con éxito");
      resetForm();
      router.push("/buy/dashboard/orders");
    },
    onError: ({ error }) => {
      toast.error("Error al cancelar la orden", {
        description: error.serverError || error.validationErrors?._errors?.[0] || "Error al cancelar la orden",
      });
      setErrorMessage(error.serverError || "Error al cancelar la orden");
    },
  });

  const handleCancelOrder = () => {
    if (!orderId) return;
    setErrorMessage(null);
    cancelExecute({ orderId });
  };

  const reportedCards = foundGiftcards.filter((c) => c.status !== "UNUSED");
  const allCardsWorthless = totalAmount === 0 && foundGiftcards.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Full-width Confirmation Panel */}
      <Card className="md:col-span-12 border-border bg-card/50 backdrop-blur-sm p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col items-center text-center">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${allCardsWorthless ? "bg-destructive/10" : "bg-primary/10"}`}
          >
            {allCardsWorthless ? <Ban className="w-10 h-10 text-destructive" /> : <Check className="w-10 h-10 text-primary" />}
          </motion.div>

          {allCardsWorthless ? (
            <>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight italic">TODAS LAS TARJETAS REPORTADAS</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Cada tarjeta en esta orden ha sido reportada como inválida. No hay <strong>nada que pagar</strong>. Puedes cancelar esta
                orden o volver para revisar tus reportes.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight italic">CONFIRMACIÓN FINAL</h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Estás a punto de confirmar que has usado todas las tarjetas correctamente. Una vez confirmado, procederás al pago y{" "}
                <strong>los reportes serán desactivados</strong>.
              </p>
            </>
          )}
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-xs text-muted-foreground uppercase font-black mb-1">Total Tarjetas</div>
            <div className="text-3xl font-black">{foundGiftcards.length}</div>
          </div>
          <div className="p-4 bg-muted/50 border border-border rounded-2xl">
            <div className="text-xs text-muted-foreground uppercase font-black mb-1">Problemas Reportados</div>
            <div className={`text-3xl font-black ${reportedCards.length > 0 ? "text-destructive" : ""}`}>{reportedCards.length}</div>
          </div>
          <div className={`p-4 rounded-2xl ${allCardsWorthless ? "bg-destructive/10 border border-destructive/20" : "bg-primary/10 border border-primary/20"}`}>
            <div className={`text-xs uppercase font-black mb-1 ${allCardsWorthless ? "text-destructive" : "text-primary"}`}>Monto Final Adeudado</div>
            <div className={`text-3xl font-black ${allCardsWorthless ? "text-destructive" : "text-primary"}`}>${totalAmount.toFixed(2)}</div>
          </div>
        </div>

        {allCardsWorthless ? (
          <div className="max-w-lg w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 text-left">
            <XCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-500 uppercase">No quedan tarjetas válidas</p>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                Todas las tarjetas han sido reportadas como inválidas, ya usadas o desactivadas. Puedes cancelar esta orden sin costo, o volver para ajustar tus reportes si cometiste un error.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-lg w-full p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive uppercase">Aviso Importante</p>
              <p className="text-sm text-destructive/80 leading-relaxed italic">
                La confirmación es irreversible. Asegúrate de tener capturas de pantalla de la redención o evidencia en video para todas las tarjetas, especialmente aquellas que reportaste con problemas.
              </p>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-sm text-destructive font-medium">{errorMessage}</p>}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            className="flex-1 h-12 text-sm font-bold text-muted-foreground hover:bg-muted"
            disabled={confirmStatus === "executing" || cancelStatus === "executing"}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Revisar
          </Button>

          {allCardsWorthless ? (
            <Button
              onClick={handleCancelOrder}
              disabled={cancelStatus === "executing" || !orderId}
              className="flex-2 h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-xl shadow-destructive/30 text-base"
            >
              {cancelStatus === "executing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" /> Cancelar Orden
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmUsage}
              disabled={confirmStatus === "executing" || !orderId}
              className="flex-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/30 text-base"
            >
              {confirmStatus === "executing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmando...
                </>
              ) : (
                "Confirmar y Proceder al Pago"
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
