'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, KeyRound, Laptop } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppSection } from '@/types';
import { dashboardMap } from '@/types/';

export interface Verify2FAFormProps {
  portal: AppSection;
}

export const Verify2FAForm = ({ portal }: Verify2FAFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const isSpanish = portal === 'buy' || portal === 'admin';

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!isRecoveryMode && code.length !== 6) return;
    if (isRecoveryMode && !code) return;

    setIsPending(true);

    try {
      if (isRecoveryMode) {
        const { error: authError } = await authClient.twoFactor.verifyBackupCode({
          code: code,
        });

        if (authError) {
          const defaultError = isSpanish ? 'Código inválido' : 'Invalid code';
          showAlert.error('Error', authError.message || defaultError);
          setIsPending(false);
          return;
        }
      } else {
        const { error: authError } = await authClient.twoFactor.verifyTotp({
          code: code,
          trustDevice: trustDevice,
        });

        if (authError) {
          const defaultError = isSpanish ? 'Código inválido' : 'Invalid code';
          showAlert.error('Error', authError.message || defaultError);
          setIsPending(false);
          return;
        }
      }

      router.push(dashboardMap[portal]);
      router.refresh();
    } catch (err) {
      console.error('2FA verification error:', err);
      showAlert.error('Error', isSpanish ? 'Error inesperado' : 'Unexpected error');
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          {isRecoveryMode ? <KeyRound className="h-8 w-8 text-emerald-400" /> : <ShieldCheck className="h-8 w-8 text-emerald-400" />}
        </div>
        <h1 className="text-xl font-medium tracking-tight text-white">
          {isRecoveryMode
            ? isSpanish
              ? 'Código de Respaldo'
              : 'Backup Code'
            : isSpanish
              ? 'Verificación en Dos Pasos'
              : 'Two-Factor Verification'}
        </h1>
        <p className="text-sm text-slate-400">
          {isRecoveryMode
            ? isSpanish
              ? 'Ingresa un código de respaldo'
              : 'Enter a backup code'
            : isSpanish
              ? 'Ingresa el código de tu app autenticadora'
              : 'Enter the code from your authenticator app'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center py-2">
          {isRecoveryMode ? (
            <Input
              placeholder={isSpanish ? 'Código de respaldo' : 'Backup code'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 max-w-xs rounded-xl border border-slate-700/50 bg-slate-800/30 text-center font-mono tracking-widest text-white uppercase placeholder:text-slate-500 focus:border-emerald-500/50"
              disabled={isPending}
              autoFocus
            />
          ) : (
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isPending} className="gap-2">
              <InputOTPGroup>
                <InputOTPSlot index={0} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
                <InputOTPSlot index={1} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
                <InputOTPSlot index={2} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
                <InputOTPSlot index={3} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
                <InputOTPSlot index={4} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
                <InputOTPSlot index={5} className="rounded-lg border border-slate-700/50 bg-slate-800/30 focus:border-emerald-500/50" />
              </InputOTPGroup>
            </InputOTP>
          )}
        </div>

        {!isRecoveryMode && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
            <Checkbox
              id="trust"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
              disabled={isPending}
              className="border-slate-600 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
            />
            <Label htmlFor="trust" className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <Laptop className="h-4 w-4" />
              {isSpanish ? 'Confiar este dispositivo' : 'Trust this device'}
            </Label>
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={isPending || (isRecoveryMode ? !code : code.length !== 6)}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Verificando...' : 'Verifying...'}
            </span>
          ) : isSpanish ? (
            'Verificar'
          ) : (
            'Verify'
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          onClick={() => {
            setIsRecoveryMode(!isRecoveryMode);
            setCode('');
          }}
          disabled={isPending}
        >
          {isRecoveryMode
            ? isSpanish
              ? 'Usar app autenticadora'
              : 'Use authenticator app'
            : isSpanish
              ? '¿Sin acceso? Usar código de respaldo'
              : 'No access? Use backup code'}
        </Button>
      </div>
    </div>
  );
};
