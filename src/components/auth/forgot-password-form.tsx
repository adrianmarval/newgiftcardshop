'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showAlert } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '@/actions/auth/forgot-password';
import { useAction } from 'next-safe-action/hooks';
import { forgotPasswordInputSchema } from '@/actions/auth/schemas';
import type { AppSection } from '@/types';
import type { z } from 'zod';

interface ForgotPasswordFormProps {
  portal?: AppSection;
}

export const ForgotPasswordForm = ({ portal = 'buy' }: ForgotPasswordFormProps) => {
  const [success, setSuccess] = useState(false);

  const isSpanish = portal === 'buy' || portal === 'admin';
  const authPath = `/${portal}/auth`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotPasswordInputSchema>>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: '', portal },
  });

  const { execute, status } = useAction(forgotPassword, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
      } else if (data?.error) {
        showAlert.error('Error', data.error);
      }
    },
    onError: ({ error }) => {
      showAlert.error(
        'Error',
        error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al enviar' : 'Failed to send'),
      );
    },
  });

  const onSubmit = (values: z.infer<typeof forgotPasswordInputSchema>) => {
    execute(values);
  };

  const isExecuting = status === 'executing';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-tight text-white sm:text-xl">{isSpanish ? 'Recuperar Contraseña' : 'Reset Password'}</h1>
        <p className="text-xs text-slate-400 sm:text-sm">
          {isSpanish ? 'Ingresa tu correo para recibir un enlace de recuperación' : 'Enter your email to receive a reset link'}
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-300 sm:text-sm">
            {isSpanish ? 'Si existe una cuenta, recibirás un enlace en tu correo.' : 'If an account exists, you will receive a reset link.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Correo electrónico' : 'Email'}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            disabled={isExecuting || success}
            {...register('email')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-11"
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-10 w-full rounded-xl bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50 sm:h-11 sm:text-sm"
          disabled={isExecuting || success}
        >
          {isExecuting ? (
            <span className="flex items-center gap-1">
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
        <Link href={`${authPath}/login`} className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" />
          {isSpanish ? 'Volver a iniciar sesión' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
};
