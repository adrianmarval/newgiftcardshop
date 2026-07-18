'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { InlineAlert } from '@/components/ui/inline-alert';
import { register } from '@/actions/auth/register';
import { useAction } from 'next-safe-action/hooks';
import { registerInputSchema } from '@/actions/auth/schemas';
import type { AppSection } from '@/types';
import type { z } from 'zod';
import { PasswordCheckItem } from './ui/password-check-item';

export interface RegisterFormProps {
  portal: AppSection;
  redirectTo: string;
  loginUrl: string;
  title: string;
  subtitle: string;
}

export const RegisterForm = ({ portal, loginUrl, title, subtitle }: RegisterFormProps) => {
  const router = useRouter();
  const isSpanish = portal === 'buy';
  const portalValue = portal;
  const submitLabel = isSpanish ? 'Crear Cuenta' : portal === 'sell' ? 'Create Account' : 'Create Account';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerInputSchema>>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', portal: portalValue },
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  useEffect(() => {
    if (serverError) setServerError(null);
  }, [watch('fullName'), watch('email'), watch('password'), watch('confirmPassword')]);

  const checks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue),
  };

  const passwordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = passwordValue === confirmPasswordValue && passwordValue.length > 0;

  const { execute, status } = useAction(register, {
    onSuccess: ({ data }) => {
      if (data && 'redirectTo' in data && data.redirectTo) {
        router.push(data.redirectTo);
      } else if (data && 'error' in data && data.error) {
        setServerError(data.error);
      }
    },
    onError: ({ error }) => {
      setServerError(
        error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al registrarse' : 'Registration failed'),
      );
    },
  });

  const onSubmit = (values: z.infer<typeof registerInputSchema>) => {
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
        {serverError && (
          <InlineAlert
            variant="error"
            title={serverError}
            autoDismiss
            dismissAfter={6000}
            onDismiss={() => setServerError(null)}
          />
        )}
        <div className="space-y-2 sm:space-y-3">
          <Label htmlFor="fullName" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Nombre completo' : 'Full Name'}
          </Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            disabled={isExecuting}
            {...registerField('fullName')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <Label htmlFor="email" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Correo electrónico' : 'Email'}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            disabled={isExecuting}
            {...registerField('email')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <Label htmlFor="password" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Contraseña' : 'Password'}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isExecuting}
            {...registerField('password')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {passwordValue && (
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-2 sm:p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase text-slate-500 sm:mb-2 sm:text-xs">{isSpanish ? 'Requisitos' : 'Requirements'}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:gap-x-4 sm:gap-y-1">
                <PasswordCheckItem valid={checks.length} label={isSpanish ? '8+ caracteres' : '8+ chars'} />
                <PasswordCheckItem valid={checks.uppercase} label={isSpanish ? 'Mayúscula' : 'Uppercase'} />
                <PasswordCheckItem valid={checks.lowercase} label={isSpanish ? 'Minúscula' : 'Lowercase'} />
                <PasswordCheckItem valid={checks.number} label={isSpanish ? 'Número' : 'Number'} />
                <PasswordCheckItem valid={checks.special} label={isSpanish ? 'Especial' : 'Special'} />
              </div>
            </div>
          )}
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300 sm:text-sm">
            {isSpanish ? 'Confirmar contraseña' : 'Confirm Password'}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            disabled={isExecuting}
            {...registerField('confirmPassword')}
            className="h-10 rounded-xl border border-slate-700/50 bg-slate-800/30 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 sm:h-12"
          />
          {confirmPasswordValue && !passwordsMatch && (
            <p className="text-xs text-red-400">{isSpanish ? 'Las contraseñas no coinciden' : 'Passwords do not match'}</p>
          )}
          {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-10 w-full rounded-xl bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50 sm:h-12 sm:text-sm"
          disabled={isExecuting || !passwordValid || !passwordsMatch}
        >
          {isExecuting ? (
            <span className="flex items-center gap-1">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Creando...' : 'Creating...'}
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-slate-400 sm:text-sm">
        {isSpanish ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
        <Link href={loginUrl} className="font-medium text-emerald-400 hover:text-emerald-300">
          {isSpanish ? 'Iniciar sesión' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
};
