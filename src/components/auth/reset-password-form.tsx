'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showAlert } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '@/actions/auth/reset-password';
import { useAction } from 'next-safe-action/hooks';
import { resetPasswordInputSchema } from '@/actions/auth/schemas';
import type { AppSection } from '@/types';
import { PasswordCheckItem } from './ui/password-check-item';
import type { z } from 'zod';

interface ResetPasswordFormProps {
  portal?: AppSection;
}

const ResetPasswordFormContent = ({ portal = 'buy' }: ResetPasswordFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const isSpanish = portal === 'buy' || portal === 'admin';
  const authPath = `/${portal}/auth`;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetPasswordInputSchema>>({
    resolver: zodResolver(resetPasswordInputSchema),
    defaultValues: { newPassword: '', confirmPassword: '', token, portal },
  });

  const newPasswordValue = watch('newPassword');
  const confirmPasswordValue = watch('confirmPassword');

  const passwordChecks = {
    length: newPasswordValue.length >= 8,
    uppercase: /[A-Z]/.test(newPasswordValue),
    lowercase: /[a-z]/.test(newPasswordValue),
    number: /[0-9]/.test(newPasswordValue),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPasswordValue),
  };

  const allValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPasswordValue === confirmPasswordValue && confirmPasswordValue.length > 0;

  const { execute, status } = useAction(resetPassword, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      } else if (data?.error) {
        const defaultError = isSpanish ? 'Error al restablecer' : 'Failed to reset';
        showAlert.error('Error', data.error || defaultError);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al restablecer' : 'Failed to reset';
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const onSubmit = (values: z.infer<typeof resetPasswordInputSchema>) => {
    execute(values);
  };

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight text-white">{isSpanish ? 'Enlace Inválido' : 'Invalid Link'}</h1>
          <p className="text-sm text-slate-400">
            {isSpanish ? 'Este enlace es inválido o ha expirado.' : 'This reset link is invalid or has expired.'}
          </p>
        </div>
        <Link
          href={`${authPath}/forgot-password`}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-6 text-xs font-semibold hover:bg-emerald-400 sm:h-11 sm:text-sm"
        >
          {isSpanish ? 'Solicitar nuevo enlace' : 'Request new link'}
        </Link>
      </div>
    );
  }

  const isExecuting = status === 'executing';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-tight text-white sm:text-xl">{isSpanish ? 'Nueva Contraseña' : 'New Password'}</h1>
        <p className="text-xs text-slate-400 sm:text-sm">{isSpanish ? 'Crea una contraseña segura' : 'Create a secure password'}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Nueva contraseña' : 'New Password'}
          </Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            disabled={isExecuting}
            {...register('newPassword')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-11"
          />
          {newPasswordValue && (
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-1.5 sm:p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-0.5">
                <PasswordCheckItem valid={passwordChecks.length} label={isSpanish ? '8+ caracteres' : '8+ chars'} />
                <PasswordCheckItem valid={passwordChecks.uppercase} label={isSpanish ? 'Mayúscula' : 'Uppercase'} />
                <PasswordCheckItem valid={passwordChecks.lowercase} label={isSpanish ? 'Minúscula' : 'Lowercase'} />
                <PasswordCheckItem valid={passwordChecks.number} label={isSpanish ? 'Número' : 'Number'} />
                <PasswordCheckItem valid={passwordChecks.special} label={isSpanish ? 'Especial' : 'Special'} />
              </div>
            </div>
          )}
          {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Confirmar contraseña' : 'Confirm Password'}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            disabled={isExecuting}
            {...register('confirmPassword')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-11"
          />
          {confirmPasswordValue && !passwordsMatch && (
            <p className="text-xs text-red-400">{isSpanish ? 'No coinciden' : 'Do not match'}</p>
          )}
          {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-10 w-full rounded-xl bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50 sm:h-11 sm:text-sm"
          disabled={isExecuting || !allValid || !passwordsMatch}
        >
          {isExecuting ? (
            <span className="flex items-center gap-1">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Restableciendo...' : 'Resetting...'}
            </span>
          ) : isSpanish ? (
            'Cambiar Contraseña'
          ) : (
            'Change Password'
          )}
        </Button>
      </form>

      <div className="flex items-center justify-center">
        <Link href={`${authPath}/login`} className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" />
          {isSpanish ? 'Volver al inicio' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
};

export const ResetPasswordForm = ({ portal = 'buy' }: { portal?: 'admin' | 'buy' | 'sell' }) => {
  const isSpanish = portal === 'buy' || portal === 'admin';
  return (
    <Suspense fallback={<div className="text-center text-slate-400">{isSpanish ? 'Cargando...' : 'Loading...'}</div>}>
      <ResetPasswordFormContent portal={portal} />
    </Suspense>
  );
};
