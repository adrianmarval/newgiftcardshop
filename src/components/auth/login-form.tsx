'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { LoginFormProps } from '@/types';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const portalValue = portal;
  const isSpanish = portal === 'buy' || portal === 'admin';

  const { execute, status } = useAction(login, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al iniciar sesión' : 'Login failed'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({ email, password, portal: portalValue });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight text-white">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="portal" value={portalValue} />

        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Correo electrónico' : 'Email'}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={emailPlaceholder}
            required
            disabled={status === 'executing'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-300">
              {isSpanish ? 'Contraseña' : 'Password'}
            </Label>
            <Link href={forgotPasswordUrl} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
              {isSpanish ? '¿Olvidaste?' : 'Forgot?'}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={status === 'executing'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={status === 'executing'}
        >
          {status === 'executing' ? (
            <span className="flex items-center gap-2">
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

      {registerUrl && (
        <p className="text-center text-sm text-slate-400">
          {registerPrompt}{' '}
          <Link href={registerUrl} className="font-medium text-emerald-400 hover:text-emerald-300">
            {registerLinkText}
          </Link>
        </p>
      )}
    </div>
  );
};
