'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clipboard, Check, Wallet, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { completeOrder } from '@/actions/buyer/orders/complete-order';
import { getBinancePayPaymentId } from '@/actions/platform/settings';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/swal';
import { Spinner } from '@/components/ui/spinner';
import { copyToClipboard } from '@/lib/clipboard';
import { BuyStepsProgress } from '@/components/buy/steps/buy-steps-progress';

export const PaymentStep = () => {
  const { orderId: storedOrderId, adjustedTotal } = useBuyFlow();

  const [transactionId, setTransactionId] = useState('');
  const [notified, setNotified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [binancePayId, setBinancePayId] = useState<string>('—');

  const { execute: executeGetPlatformSetting } = useAction(getBinancePayPaymentId, {
    onSuccess: ({ data }) => {
      console.log({ data });
      if (data?.success) {
        const binancePayIdSetting = data.binancePayId;
        if (!binancePayIdSetting) {
          showAlert.error('Configuración faltante', 'No se encontró la configuración de Binance Pay');
          return;
        }
        setBinancePayId(binancePayIdSetting);
      }
    },
    onError: () => {
      showAlert.error('Error', 'Error al obtener la configuración de Binance Pay');
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
      showAlert.error('Error al completar orden', errorDescription);
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
      <div className="flex h-full min-h-0 flex-col gap-1">
        <BuyStepsProgress />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-primary/20 flex h-16 w-16 items-center justify-center rounded-full md:h-20 md:w-20"
          >
            <Check className="text-primary h-8 w-8 md:h-10 md:w-10" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight uppercase italic md:text-3xl">¡Pago Notificado!</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Hemos recibido tu notificación de pago para la orden <strong>#{storedOrderId?.slice(-8)}</strong>. La orden ha sido marcada como
              completada.
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = '/store/dashboard')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 font-bold md:h-12 md:px-8"
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      <Card className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 border p-3 text-center backdrop-blur-sm md:gap-6 md:p-6">
        <div className="max-w-md space-y-2 md:max-w-xl md:space-y-3">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary/10 mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full md:mb-3 md:h-14 md:w-14"
          >
            <Wallet className="text-primary h-5 w-5 md:h-7 md:w-7" />
          </motion.div>
          <h2 className="text-xl font-black tracking-tight uppercase italic md:text-2xl">Binance Pay</h2>
          <p className="text-muted-foreground text-xs md:text-base">Envía el monto exacto al ID a continuación.</p>
        </div>

        <div className="group border-border bg-muted/50 relative w-full max-w-xs space-y-3 overflow-hidden rounded-2xl border p-3 md:max-w-sm md:p-5">
          <div className="relative z-10 space-y-0.5">
            <div className="text-muted-foreground text-[9px] font-black tracking-widest uppercase md:text-[10px]">Total a Pagar</div>
            <div className="text-primary text-2xl font-black md:text-4xl">${adjustedTotal != null ? adjustedTotal.toFixed(2) : '—'}</div>
          </div>

          <div className="relative z-10 space-y-1.5">
            <Label className="text-muted-foreground text-[9px] font-black uppercase md:text-[10px]">ID de Binance Pay</Label>
            <div className="border-border bg-card flex items-center justify-center gap-2 rounded-lg border p-1.5 font-mono text-sm font-bold md:p-2 md:text-base">
              {binancePayId}
              {binancePayId !== '—' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-primary hover:bg-primary/10 h-5 w-5 md:h-6 md:w-6"
                  onClick={async () => {
                    const success = await copyToClipboard(binancePayId);
                    if (success) {
                      showAlert.toast.success('ID de Binance Pay copiado al portapapeles');
                    }
                  }}
                >
                  <Clipboard className="h-2.5 w-2.5 md:h-3 md:w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2 md:max-w-sm md:space-y-3">
          <div className="space-y-1 text-left">
            <Label className="text-muted-foreground ml-1 text-[9px] font-black tracking-tight uppercase md:text-[10px]">
              ID de Transacción (opcional)
            </Label>
            <Input
              placeholder="ID de transacción"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="border-border text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 h-9 text-center font-mono text-base md:h-10 md:text-lg"
            />
          </div>

          {errorMessage && <p className="text-destructive text-center text-xs font-medium">{errorMessage}</p>}

          <div className="border-primary/20 bg-primary/5 flex w-full max-w-xs gap-2 rounded-xl border p-2 text-left md:max-w-sm md:p-3">
            <Info className="text-primary mt-0.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            <p className="text-muted-foreground text-xs leading-relaxed italic md:text-sm">La verificación es instantanea.</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-center-safe gap-2">
        <Button
          onClick={handleNotify}
          disabled={!storedOrderId || completeStatus === 'executing'}
          className="bg-primary text-primary-foreground h-9 text-xs font-bold md:h-10 md:text-sm"
        >
          {completeStatus === 'executing' ? (
            <>
              <Spinner size="sm" className="mr-1.5 h-3.5 w-3.5" />
              Notificando...
            </>
          ) : (
            'Notificar Pago'
          )}
        </Button>
      </div>
    </div>
  );
};