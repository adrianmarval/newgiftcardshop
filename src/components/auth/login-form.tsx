'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSwal } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/actions/auth/login';
import { resendVerification } from '@/actions/auth/resend-verification';
import { PasskeySignInButton } from '@/components/auth/passkey/passkey-sign-in-button';
import { useAction } from 'next-safe-action/hooks';
import { loginInputSchema } from '@/actions/auth/schemas';
import type { AppSection } from '@/types';
import type { z } from 'zod';

export interface LoginFormProps {
  portal: AppSection;
  title: string;
  subtitle: string;
  forgotPasswordUrl: string;
  emailPlaceholder?: string;
  registerUrl?: string;
  registerPrompt?: string;
  registerLinkText?: string;
}

export const LoginForm = ({
  portal,
  title,
  subtitle,
  forgotPasswordUrl,
  emailPlaceholder = 'you@example.com',
  registerUrl,
  registerPrompt = "Don't have an account?",
  registerLinkText = 'Sign up',
}: LoginFormProps) => {
  const router = useRouter();
  const portalValue = portal;
  const isSpanish = portal === 'buy' || portal === 'admin';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginInputSchema>>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '', portal: portalValue },
  });

  const emailValue = watch('email');

  const { execute, status } = useAction(login, {
    onSuccess: ({ data }) => {
      if (!data) return;
      if ('redirectTo' in data && data.redirectTo) {
        router.push(data.redirectTo);
      } else if ('error' in data && data.error) {
        const needsVerification = 'needsVerification' in data && data.needsVerification;
        if (needsVerification) {
          showSwal
            .fire({
              icon: 'error',
              title: isSpanish ? 'Email no verificado' : 'Email not verified',
              text: data.error,
              confirmButtonText: isSpanish ? 'Reenviar email' : 'Resend email',
              cancelButtonText: isSpanish ? 'Cancelar' : 'Cancel',
              showCancelButton: true,
            })
            .then((result) => {
              if (result.isConfirmed && emailValue) {
                resendExecute({ portal: portalValue, email: emailValue });
              }
            });
        } else {
          showSwal.fire({ icon: 'error', title: 'Error', text: data.error });
        }
      }
    },
    onError: ({ error }) => {
      showSwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al iniciar sesión' : 'Login failed'),
      });
    },
  });

  const { execute: resendExecute, status: _resendStatus } = useAction(resendVerification, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        showSwal.fire({
          icon: 'success',
          title: isSpanish ? 'Email reenviado' : 'Email resent',
          text: isSpanish ? 'Revisa tu bandeja de entrada' : 'Check your inbox',
        });
      } else if (data?.error) {
        showSwal.fire({ icon: 'error', title: 'Error', text: data.error });
      }
    },
    onError: ({ error }) => {
      showSwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al reenviar' : 'Failed to resend'),
      });
    },
  });

  const onSubmit = (values: z.infer<typeof loginInputSchema>) => {
    execute(values);
  };

  const isExecuting = status === 'executing';

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight text-white sm:text-2xl">{title}</h1>
        <p className="text-xs text-slate-400 sm:text-sm">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="space-y-2 sm:space-y-3">
          <Label htmlFor="email" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Correo electrónico' : 'Email'}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={emailPlaceholder}
            autoComplete="username webauthn"
            disabled={isExecuting}
            {...register('email')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300 sm:text-sm">
              {isSpanish ? 'Contraseña' : 'Password'}
            </Label>
            <Link href={forgotPasswordUrl} className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 sm:text-xs">
              {isSpanish ? '¿Olvidaste?' : 'Forgot?'}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isExecuting}
            {...register('password')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-10 w-full rounded-xl bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50 sm:h-12 sm:text-sm"
          disabled={isExecuting}
        >
          {isExecuting ? (
            <span className="flex items-center gap-1">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Iniciando...' : 'Signing in...'}
            </span>
          ) : isSpanish ? (
            'Iniciar Sesión'
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <PasskeySignInButton portal={portal} isSpanish={isSpanish} disabled={isExecuting} />

      {registerUrl && (
        <p className="text-center text-xs text-slate-400 sm:text-sm">
          {registerPrompt}{' '}
          <Link href={registerUrl} className="font-medium text-emerald-400 hover:text-emerald-300">
            {registerLinkText}
          </Link>
        </p>
      )}
    </div>
  );
};
