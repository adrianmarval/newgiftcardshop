"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clipboard, Check, Wallet, Info, ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { completeOrder } from "@/actions/order-actions";
import { getPlatformSetting } from "@/actions/platform-actions";
import { toast } from "sonner";

export function PaymentStep() {
  const { setStep, orderId: storedOrderId, adjustedTotal } = useBuyFlow();

  const [transactionId, setTransactionId] = useState("");
  const [isNotifying, setIsNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [binancePayId, setBinancePayId] = useState<string>("—");

  useEffect(() => {
    getPlatformSetting().then((response) => {
      if (!response.data) {
        toast.error("Error al obtener la configuración de Binance Pay");
        return;
      }
      const binancePayIdSetting = response.data.find((setting) => setting.key === "binance_pay_id");
      if (!binancePayIdSetting) {
        toast.error("No se encontró la configuración de Binance Pay");
        return;
      }
      setBinancePayId(binancePayIdSetting.value);
    });
  }, []);

  const handleNotify = async () => {
    if (!storedOrderId) return;
    setIsNotifying(true);
    setErrorMessage(null);
    const result = await completeOrder({ orderId: storedOrderId, _transactionId: transactionId });
    if (!result.data) {
      const errorDescription = result.serverError || result.validationErrors?._errors?.join("") || "Error al completar orden";
      toast.error("Error al completar orden", { description: errorDescription });
      setErrorMessage(errorDescription);
      return;
    }
    setNotified(true);
    setIsNotifying(false);
  };

  if (notified) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 pt-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center"
        >
          <Check className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase tracking-tight">Payment Notified!</h2>
          <p className="text-muted-foreground text-base max-w-sm">
            We have received your payment notification for order <strong>#{storedOrderId?.slice(-8)}</strong>. The order has been marked as
            completed.
          </p>
        </div>
        <Button
          onClick={() => (window.location.href = "/buy/dashboard")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-8"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Full-width Payment Panel */}
      <Card className="md:col-span-12 border-border bg-card/50 backdrop-blur-sm p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col items-center text-center">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Wallet className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight italic uppercase">Binance Pay Detail</h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Send the exact amount to the Binance Pay ID below to complete your order.
          </p>
        </div>

        <div className="w-full max-w-md bg-muted/50 border border-border rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden group">
          <div className="space-y-1 relative z-10">
            <div className="text-xs text-muted-foreground uppercase font-black tracking-widest">Total to Pay</div>
            <div className="text-4xl md:text-5xl font-black text-primary">${adjustedTotal != null ? adjustedTotal.toFixed(2) : "—"}</div>
          </div>

          <div className="space-y-2 relative z-10">
            <Label className="text-xs text-muted-foreground uppercase font-black">Binance Pay ID</Label>
            <div className="flex items-center gap-2 bg-card border border-border p-3 rounded-xl justify-center font-mono text-xl font-bold">
              {binancePayId}
              {binancePayId !== "—" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-primary hover:bg-primary/10"
                  onClick={() => navigator.clipboard.writeText(binancePayId)}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
        </div>

        <div className="max-w-md w-full space-y-4">
          <div className="space-y-1.5 text-left">
            <Label className="text-xs text-muted-foreground uppercase font-black ml-1">Transaction ID (optional)</Label>
            <Input
              placeholder="Enter your payment transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="h-12 border-border bg-card/50 text-foreground font-mono font-bold text-center text-xl placeholder:text-muted-foreground/30 focus:border-primary/50"
            />
          </div>

          {errorMessage && <p className="text-sm text-destructive font-medium text-center">{errorMessage}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(4)}
              className="flex-1 h-12 text-sm font-bold text-muted-foreground hover:bg-muted"
              disabled={isNotifying}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleNotify}
              disabled={!storedOrderId || isNotifying}
              className="flex-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/30"
            >
              {isNotifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Notifying...
                </>
              ) : (
                "Notify Payment"
              )}
            </Button>
          </div>
        </div>

        <div className="max-w-md w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 text-left">
          <Info className="w-5 h-5 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            Once you notify the payment, our system will pair the transaction with your order using the ID provided. Verification usually
            takes 1-5 minutes.
          </p>
        </div>
      </Card>
    </div>
  );
}
