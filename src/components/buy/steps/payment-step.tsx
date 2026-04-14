'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clipboard, Check, Wallet, Info, ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { completeOrder } from '@/actions/order-actions';
import { getPlatformSetting } from '@/actions/platform-actions';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

export function PaymentStep() {
  const { setStep, orderId: storedOrderId, adjustedTotal } = useBuyFlow();

  const [transactionId, setTransactionId] = useState('');
  const [notified, setNotified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [binancePayId, setBinancePayId] = useState<string>('—');

  useEffect(() => {
    getPlatformSetting().then((result) => {
      if (result.data?.success && result.data.settings) {
        const binancePayIdSetting = result.data.settings.find((setting) => setting.key === 'binance_pay_id');
        if (!binancePayIdSetting) {
          toast.error('No se encontró la configuración de Binance Pay');
          return;
        }
        setBinancePayId(binancePayIdSetting.value);
      } else if (result.serverError || result.validationErrors) {
        toast.error('Error al obtener la configuración de Binance Pay');
      }
    });
  }, []);

  const { execute: completeExecute, status: completeStatus } = useAction(completeOrder, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setNotified(true);
      }
    },
    onError: ({ error }) => {
      const errorDescription = error.serverError || error.validationErrors?._errors?.join('') || 'Error al completar orden';
      toast.error('Error al completar orden', {
        description: errorDescription,
      });
      setErrorMessage(errorDescription);
    },
  });

  const handleNotify = () => {
    if (!storedOrderId) return;
    setErrorMessage(null);
    completeExecute({ orderId: storedOrderId, _transactionId: transactionId });
  };

  if (notified) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 pt-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-primary/20 flex h-24 w-24 items-center justify-center rounded-full"
        >
          <Check className="text-primary h-12 w-12" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight uppercase italic">¡Pago Notificado!</h2>
          <p className="text-muted-foreground max-w-sm text-base">
            Hemos recibido tu notificación de pago para la orden <strong>#{storedOrderId?.slice(-8)}</strong>. La orden ha sido marcada como
            completada.
          </p>
        </div>
        <Button
          onClick={() => (window.location.href = '/buy/dashboard')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 font-bold"
        >
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Full-width Payment Panel */}
      <Card className="border-border bg-card/50 flex flex-col items-center space-y-6 p-4 text-center backdrop-blur-sm md:col-span-12 md:space-y-8 md:p-8">
        <div className="max-w-2xl space-y-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          >
            <Wallet className="text-primary h-8 w-8" />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic md:text-4xl">Detalle de Binance Pay</h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Envía el monto exacto al ID de Binance Pay a continuación para completar tu orden.
          </p>
        </div>

        <div className="group border-border bg-muted/50 relative w-full max-w-md space-y-6 overflow-hidden rounded-2xl border p-6 md:p-8">
          <div className="relative z-10 space-y-1">
            <div className="text-muted-foreground text-xs font-black tracking-widest uppercase">Total a Pagar</div>
            <div className="text-primary text-4xl font-black md:text-5xl">${adjustedTotal != null ? adjustedTotal.toFixed(2) : '—'}</div>
          </div>

          <div className="relative z-10 space-y-2">
            <Label className="text-muted-foreground text-xs font-black uppercase">ID de Binance Pay</Label>
            <div className="border-border bg-card flex items-center justify-center gap-2 rounded-xl border p-3 font-mono text-xl font-bold">
              {binancePayId}
              {binancePayId !== '—' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-primary hover:bg-primary/10 h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(binancePayId)}
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="bg-primary/5 absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full transition-transform duration-700 group-hover:scale-110" />
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1.5 text-left">
            <Label className="text-muted-foreground ml-1 text-xs font-black uppercase">ID de Transacción (opcional)</Label>
            <Input
              placeholder="Ingresa el ID de la transacción de pago"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="border-border bg-card/50 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 h-12 text-center font-mono text-xl font-bold"
            />
          </div>

          {errorMessage && <p className="text-destructive text-center text-sm font-medium">{errorMessage}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setStep(4)}
              className="text-muted-foreground hover:bg-muted h-12 flex-1 text-sm font-bold"
              disabled={completeStatus === 'executing'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
            <Button
              onClick={handleNotify}
              disabled={!storedOrderId || completeStatus === 'executing'}
              className="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 h-12 flex-2 font-bold shadow-xl"
            >
              {completeStatus === 'executing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Notificando...
                </>
              ) : (
                'Notificar Pago'
              )}
            </Button>
          </div>
        </div>

        <div className="border-primary/20 bg-primary/5 flex w-full max-w-md gap-3 rounded-xl border p-4 text-left">
          <Info className="text-primary mt-0.5 h-5 w-5" />
          <p className="text-muted-foreground text-xs leading-relaxed italic">
            Una vez que notifiques el pago, nuestro sistema vinculará la transacción con tu orden usando el ID proporcionado. La
            verificación suele tardar de 1 a 5 minutos.
          </p>
        </div>
      </Card>
    </div>
  );
}
