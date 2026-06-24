'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { showAlert } from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import { AppSection, appSectionMap } from '@/types';
import { PasswordCheckItem } from './ui/password-check-item';

interface ResetPasswordFormProps {
  portal?: AppSection;
}

const ResetPasswordFormContent = ({ portal = 'buy' }: ResetPasswordFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isSpanish = portal === 'buy' || portal === 'admin';

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewPassword(value);
    setPasswordChecks({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
    });
  };

  const allValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const portalPath = appSectionMap[portal];
  const authPath = `${portalPath}/auth`;

  const { execute, status } = useAction(resetPassword, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al restablecer' : 'Failed to reset';
      showAlert.error('Error', error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    execute({ token, newPassword, confirmPassword, portal });
  };

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
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
          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold hover:bg-emerald-400"
        >
          {isSpanish ? 'Solicitar nuevo enlace' : 'Request new link'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight text-white">{isSpanish ? 'Nueva Contraseña' : 'New Password'}</h1>
        <p className="text-sm text-slate-400">{isSpanish ? 'Crea una contraseña segura' : 'Create a secure password'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="portal" value={portal} />
        <input type="hidden" name="token" value={token} />

        <div className="space-y-3">
          <Label htmlFor="newPassword" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Nueva contraseña' : 'New Password'}
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={handlePasswordChange}
            required
            disabled={status === 'executing'}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
          {newPassword && (
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <PasswordCheckItem valid={passwordChecks.length} label={isSpanish ? '8+ caracteres' : '8+ chars'} />
                <PasswordCheckItem valid={passwordChecks.uppercase} label={isSpanish ? 'Mayúscula' : 'Uppercase'} />
                <PasswordCheckItem valid={passwordChecks.lowercase} label={isSpanish ? 'Minúscula' : 'Lowercase'} />
                <PasswordCheckItem valid={passwordChecks.number} label={isSpanish ? 'Número' : 'Number'} />
                <PasswordCheckItem valid={passwordChecks.special} label={isSpanish ? 'Especial' : 'Special'} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Confirmar contraseña' : 'Confirm Password'}
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            disabled={status === 'executing'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
          {confirmPassword && !passwordsMatch && <p className="text-xs text-red-400">{isSpanish ? 'No coinciden' : 'Do not match'}</p>}
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={status === 'executing' || !allValid || !passwordsMatch}
        >
          {status === 'executing' ? (
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
