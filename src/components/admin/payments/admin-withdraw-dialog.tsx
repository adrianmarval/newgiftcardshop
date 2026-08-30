'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { Loader2, Wallet } from 'lucide-react';
import { getBinanceBalances, getWithdrawInfo, withdrawBalance } from '@/actions/admin/binance';
import { getPlatformBalance } from '@/actions/platform';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showAlert } from '@/lib/ui';
import { formatCurrency } from '@/lib/utils';

interface AdminWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface WithdrawInfo {
  configured: boolean;
  walletMasked?: string;
  coin?: string;
  network?: string;
}

export const AdminWithdrawDialog = ({ open, onOpenChange, onSuccess }: AdminWithdrawDialogProps) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [platformBalance, setPlatformBalance] = useState<number | null>(null);
  const [fundingBalance, setFundingBalance] = useState<number | null>(null);
  const [withdrawInfo, setWithdrawInfo] = useState<WithdrawInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const loadInfo = useCallback(async () => {
    setIsLoadingInfo(true);
    try {
      const [binanceRes, platformRes, infoRes] = await Promise.all([getBinanceBalances(), getPlatformBalance(), getWithdrawInfo()]);
      setFundingBalance(binanceRes.data ? Number(binanceRes.data.funding) : null);
      setPlatformBalance(platformRes.data?.success ? platformRes.data.balance : null);
      setWithdrawInfo(infoRes.data ?? { configured: false });
    } catch {
      setFundingBalance(null);
      setPlatformBalance(null);
      setWithdrawInfo({ configured: false });
    } finally {
      setIsLoadingInfo(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setAmount('');
      setNotes('');
      loadInfo();
    }
  }, [open, loadInfo]);

  const available =
    platformBalance !== null && fundingBalance !== null ? Math.min(platformBalance, fundingBalance) : null;

  const { execute, isExecuting } = useAction(withdrawBalance, {
    onSuccess: ({ data }) => {
      if (!data) return;
      if (data.error) {
        // Network error — quedó PENDING y el sync lo resolverá
        showAlert.warning('Retiro Pendiente', data.error);
      } else {
        showAlert.success(
          'Retiro Enviado',
          `Se enviaron ${formatCurrency(data.amount)} a Binance. Queda PENDIENTE hasta la confirmación on-chain (sync automático cada 5 min).`,
        );
      }
      onSuccess();
    },
    onError: ({ error }) => {
      showAlert.error('Error en el Retiro', error.serverError ?? 'No se pudo procesar el retiro.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert.error('Monto inválido', 'Ingresa un monto mayor a 0.');
      return;
    }

    if (available !== null && numericAmount > available) {
      showAlert.error('Monto excede el disponible', `El máximo retirable es ${formatCurrency(available)}.`);
      return;
    }

    const confirmed = await showAlert.confirm(
      'Confirmar Retiro',
      <div className="space-y-1 text-left">
        <p>
          Vas a retirar <b>{formatCurrency(numericAmount)}</b> hacia la wallet del admin:
        </p>
        <p className="font-mono text-sm">
          {withdrawInfo?.walletMasked} ({withdrawInfo?.coin} · {withdrawInfo?.network})
        </p>
        <p className="text-muted-foreground text-sm">Esta acción mueve fondos REALES desde la Funding wallet de Binance.</p>
      </div>,
      { confirmText: 'Retirar', cancelText: 'Cancelar', danger: true },
    );

    if (!confirmed) return;

    execute({ amount: numericAmount, notes: notes.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar Fondos</DialogTitle>
          <DialogDescription>Retira las ganancias de la plataforma hacia la wallet del administrador.</DialogDescription>
        </DialogHeader>

        {isLoadingInfo ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !withdrawInfo?.configured ? (
          <p className="rounded bg-red-100 p-2 text-sm text-red-600">
            El retiro no está configurado en el servidor (WITHDRAW_WALLET/WITHDRAW_COIN/WITHDRAW_NETWORK).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-1">
            <div className="bg-muted/50 space-y-1 rounded-md border p-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance plataforma</span>
                <span className="font-medium">{platformBalance !== null ? formatCurrency(platformBalance) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding Binance</span>
                <span className="font-medium">{fundingBalance !== null ? formatCurrency(fundingBalance) : '—'}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Disponible para retirar</span>
                <span className="font-bold">{available !== null ? formatCurrency(available) : '—'}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-1 pt-1 text-xs">
                <Wallet className="h-3 w-3" />
                Destino: <span className="font-mono">{withdrawInfo.walletMasked}</span> ({withdrawInfo.coin} ·{' '}
                {withdrawInfo.network})
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Monto (USDT)</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={available ?? undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Retiro de ganancias"
                rows={2}
                maxLength={255}
                className="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExecuting || available === null || available <= 0}>
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  'Retirar'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
