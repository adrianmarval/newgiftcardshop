'use client';

import { useState } from 'react';
import Link from 'next/link';
import { showAlert } from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import { AppSection, appSectionMap } from '@/types';

interface ForgotPasswordFormProps {
  portal?: AppSection;
}

export const ForgotPasswordForm = ({ portal = 'buy' }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const isSpanish = portal === 'buy' || portal === 'admin';
  const portalPath = appSectionMap[portal];
  const authPath = `${portalPath}/auth`;

  const { execute, status } = useAction(forgotPassword, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
      }
    },
    onError: ({ error }) => {
      showAlert.error(
        'Error',
        error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al enviar' : 'Failed to send'),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({ email, portal });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight text-white">{isSpanish ? 'Recuperar Contraseña' : 'Reset Password'}</h1>
        <p className="text-sm text-slate-400">
          {isSpanish ? 'Ingresa tu correo para recibir un enlace de recuperación' : 'Enter your email to receive a reset link'}
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">
            {isSpanish ? 'Si existe una cuenta, recibirás un enlace en tu correo.' : 'If an account exists, you will receive a reset link.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="portal" value={portal} />

        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Correo electrónico' : 'Email'}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={status === 'executing' || success}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={status === 'executing' || success}
        >
          {status === 'executing' ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Enviando...' : 'Sending...'}
            </span>
          ) : isSpanish ? (
            'Enviar Enlace'
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <div className="flex items-center justify-center">
        <Link href={`${authPath}/login`} className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" />
          {isSpanish ? 'Volver a iniciar sesión' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
};
