'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clipboard, Check, Wallet, Info, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { completeOrder } from '@/actions/order/complete';
import { getPlatformSetting } from '@/actions/platform/settings';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export const PaymentStep = () => {
  const { setStep, orderId: storedOrderId, adjustedTotal } = useBuyFlow();

  const [transactionId, setTransactionId] = useState('');
  const [notified, setNotified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [binancePayId, setBinancePayId] = useState<string>('—');

  const { execute: executeGetPlatformSetting } = useAction(getPlatformSetting, {
    onSuccess: ({ data }) => {
      if (data?.success && data.settings) {
        const binancePayIdSetting = data.settings.find((setting) => setting.key === 'binance_pay_id');
        if (!binancePayIdSetting) {
          toast.error('No se encontró la configuración de Binance Pay');
          return;
        }
        setBinancePayId(binancePayIdSetting.value);
      }
    },
    onError: () => {
      toast.error('Error al obtener la configuración de Binance Pay');
    },
  });

  useEffect(() => {
    executeGetPlatformSetting();
  }, [executeGetPlatformSetting]);

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
      <Card className="border-border bg-card/50 flex flex-col items-center space-y-4 p-4 text-center backdrop-blur-sm md:col-span-12 md:space-y-8 md:p-8">
        <div className="max-w-2xl space-y-2 md:space-y-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full md:mb-4 md:h-16 md:w-16"
          >
            <Wallet className="text-primary h-6 w-6 md:h-8 md:w-8" />
          </motion.div>
          <h2 className="text-2xl font-black tracking-tight uppercase italic md:text-3xl">Binance Pay</h2>
          <p className="text-muted-foreground text-sm md:text-base">Envía el monto exacto al ID a continuación.</p>
        </div>

        <div className="group border-border bg-muted/50 relative w-full max-w-sm space-y-4 overflow-hidden rounded-2xl border p-4 md:p-8">
          <div className="relative z-10 space-y-0.5">
            <div className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">Total a Pagar</div>
            <div className="text-primary text-3xl font-black md:text-5xl">${adjustedTotal != null ? adjustedTotal.toFixed(2) : '—'}</div>
          </div>

          <div className="relative z-10 space-y-1.5">
            <Label className="text-muted-foreground text-[10px] font-black uppercase">ID de Binance Pay</Label>
            <div className="border-border bg-card flex items-center justify-center gap-2 rounded-lg border p-2 font-mono text-lg font-bold">
              {binancePayId}
              {binancePayId !== '—' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-primary hover:bg-primary/10 h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(binancePayId)}
                >
                  <Clipboard className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div className="space-y-1 text-left">
            <Label className="text-muted-foreground ml-1 text-[10px] font-black tracking-tight uppercase">
              ID de Transacción (opcional)
            </Label>
            <Input
              placeholder="ID de transacción"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="border-border bg-card/50 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 h-10 text-center font-mono text-lg font-bold"
            />
          </div>

          {errorMessage && <p className="text-destructive text-center text-xs font-medium">{errorMessage}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setStep(4)}
              className="text-muted-foreground hover:bg-muted h-10 flex-1 text-xs font-bold"
              disabled={completeStatus === 'executing'}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Atrás
            </Button>
            <Button onClick={handleNotify} disabled={!storedOrderId || completeStatus === 'executing'}>
              {completeStatus === 'executing' ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Notificando...
                </>
              ) : (
                'Notificar Pago'
              )}
            </Button>
          </div>
        </div>

        <div className="border-primary/20 bg-primary/5 flex w-full max-w-sm gap-2 rounded-xl border p-3 text-left">
          <Info className="text-primary mt-0.5 h-4 w-4" />
          <p className="text-muted-foreground text-[10px] leading-relaxed italic">La verificación suele tardar de 1 a 5 minutos.</p>
        </div>
      </Card>
    </div>
  );
};
