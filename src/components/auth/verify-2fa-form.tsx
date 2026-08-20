'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { showAlert } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, KeyRound, Laptop } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { AppSection } from '@/types';

export interface Verify2FAFormProps {
  portal: AppSection;
}

interface TwoFactorFormValues {
  code: string;
  trustDevice: boolean;
}

export const Verify2FAForm = ({ portal }: Verify2FAFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const isSpanish = portal === 'buy' || portal === 'admin';

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TwoFactorFormValues>({
    defaultValues: { code: '', trustDevice: false },
  });

  const codeValue = watch('code');
  const trustDeviceValue = watch('trustDevice');

  const onSubmit = async (values: TwoFactorFormValues) => {
    if (!isRecoveryMode && values.code.length !== 6) return;
    if (isRecoveryMode && !values.code) return;

    setIsPending(true);

    try {
      if (isRecoveryMode) {
        const { error: authError } = await authClient.twoFactor.verifyBackupCode({
          code: values.code,
        });

        if (authError) {
          const defaultError = isSpanish ? 'Código inválido' : 'Invalid code';
          showAlert.error('Error', authError.message || defaultError);
          setIsPending(false);
          return;
        }
      } else {
        const { error: authError } = await authClient.twoFactor.verifyTotp({
          code: values.code,
          trustDevice: values.trustDevice,
        });

        if (authError) {
          const defaultError = isSpanish ? 'Código inválido' : 'Invalid code';
          showAlert.error('Error', authError.message || defaultError);
          setIsPending(false);
          return;
        }
      }

      // La página de setup-passkey es self-guarding: si el usuario ya tiene
      // passkeys o la dismissió, redirige al dashboard sin renderizar.
      router.push(`/${portal}/auth/setup-passkey`);
      router.refresh();
    } catch (err) {
      console.error('2FA verification error:', err);
      showAlert.error('Error', isSpanish ? 'Error inesperado' : 'Unexpected error');
      setIsPending(false);
    }
  };

  const toggleRecoveryMode = () => {
    setIsRecoveryMode(!isRecoveryMode);
    setValue('code', '');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1 text-center">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-center py-2">
          {isRecoveryMode ? (
            <Input
              placeholder={isSpanish ? 'Código de respaldo' : 'Backup code'}
              disabled={isPending}
              autoFocus
              {...register('code', { required: true })}
              className="h-12 max-w-xs rounded-xl border border-slate-700/50 bg-slate-800/30 text-center font-mono tracking-widest uppercase placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          ) : (
            <InputOTP
              maxLength={6}
              value={codeValue}
              onChange={(val) => setValue('code', val, { shouldValidate: true })}
              disabled={isPending}
              className="gap-1"
            >
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
          <div className="flex items-center gap-1 rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
            <Checkbox
              id="trust"
              checked={trustDeviceValue}
              onCheckedChange={(checked) => setValue('trustDevice', checked as boolean)}
              disabled={isPending}
              className="border-slate-600 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
            />
            <Label htmlFor="trust" className="flex cursor-pointer items-center gap-1 text-sm text-slate-300">
              <Laptop className="h-4 w-4" />
              {isSpanish ? 'Confiar este dispositivo' : 'Trust this device'}
            </Label>
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={isPending || (isRecoveryMode ? !codeValue : codeValue.length !== 6)}
        >
          {isPending ? (
            <span className="flex items-center gap-1">
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
          onClick={toggleRecoveryMode}
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
