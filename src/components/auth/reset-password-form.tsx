'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Check, X } from 'lucide-react';
import { resetPassword } from '@/actions';
import { useAction } from 'next-safe-action/hooks';

const PasswordCheckItem = ({ valid, label, portal = 'buy' }: { valid: boolean; label: string; portal?: string }) => (
  <div className="flex items-center gap-2 text-base">
    {valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="text-muted-foreground h-4 w-4" />}
    <span className={valid ? 'text-primary font-medium' : 'text-muted-foreground'}>{label}</span>
  </div>
);

function ResetPasswordFormContent({ portal = 'buy' }: { portal?: 'admin' | 'buy' | 'sell' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const portalPath = portal === 'buy' ? '/buy' : `/${portal}`;
  const authPath = `${portalPath}/auth`;

  const { execute, status } = useAction(resetPassword, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al restablecer la contraseña' : 'Failed to reset password';
      setError(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ token, newPassword, confirmPassword, portal });
  };

  if (!token) {
    return (
      <Card className="mx-auto w-full max-w-md border-none bg-transparent p-8 shadow-none">
        <div className="space-y-4 text-center">
          <AlertCircle className="text-destructive mx-auto h-12 w-12" />
          <h1 className="text-3xl font-bold">{isSpanish ? 'Enlace Inválido' : 'Invalid Reset Link'}</h1>
          <p className="text-muted-foreground text-base">
            {isSpanish
              ? 'Este enlace de restablecimiento es inválido o ha expirado.'
              : 'This password reset link is invalid or has expired.'}
          </p>
          <Link href={`${authPath}/forgot-password`} className="text-primary text-base font-semibold hover:underline">
            {isSpanish ? 'Solicita un nuevo enlace' : 'Request a new reset link'}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md border-none bg-transparent p-8 shadow-none">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{isSpanish ? 'Restablecer Contraseña' : 'Reset Password'}</h1>
          <p className="text-muted-foreground text-base">
            {isSpanish ? 'Crea una nueva contraseña para tu cuenta' : 'Create a new password for your account'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-semibold tracking-wider uppercase opacity-70">
              {isSpanish ? 'Nueva Contraseña' : 'New Password'}
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
              className="bg-muted/50 h-11 border-none"
            />
            <div className="bg-muted/30 mt-2 space-y-2 rounded-lg p-3">
              <p className="text-sm font-semibold uppercase opacity-60">{isSpanish ? 'Requisitos:' : 'Requirements:'}</p>
              <div className="grid grid-cols-1 gap-1">
                <PasswordCheckItem valid={passwordChecks.length} label={isSpanish ? 'Al menos 8 caracteres' : 'At least 8 characters'} />
                <PasswordCheckItem valid={passwordChecks.uppercase} label={isSpanish ? 'Una letra mayúscula' : 'Uppercase letter'} />
                <PasswordCheckItem valid={passwordChecks.lowercase} label={isSpanish ? 'Una letra minúscula' : 'Lowercase letter'} />
                <PasswordCheckItem valid={passwordChecks.number} label={isSpanish ? 'Un número' : 'Number'} />
                <PasswordCheckItem valid={passwordChecks.special} label={isSpanish ? 'Un carácter especial' : 'Special character'} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold tracking-wider uppercase opacity-70">
              {isSpanish ? 'Confirmar Contraseña' : 'Confirm Password'}
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
              className="bg-muted/50 h-11 border-none"
            />
          </div>

          <Button type="submit" className="h-11 w-full font-semibold" disabled={status === 'executing' || !allValid}>
            {status === 'executing' ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {isSpanish ? 'Restableciendo...' : 'Resetting...'}
              </>
            ) : isSpanish ? (
              'Restablecer Contraseña'
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-base">
          <Link href={`${authPath}/login`} className="text-primary font-semibold hover:underline">
            {isSpanish ? 'Volver al Inicio de Sesión' : 'Back to Sign In'}
          </Link>
        </p>
      </div>
    </Card>
  );
}

export function ResetPasswordForm({ portal = 'buy' }: { portal?: 'admin' | 'buy' | 'sell' }) {
  const isSpanish = portal === 'buy' || portal === 'admin';
  return (
    <Suspense fallback={<div>{isSpanish ? 'Cargando...' : 'Loading...'}</div>}>
      <ResetPasswordFormContent portal={portal} />
    </Suspense>
  );
}
