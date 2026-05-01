'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Check, X } from 'lucide-react';
import { register } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { RegisterFormProps } from '@/types';

const PasswordCheckItem = ({ valid, label }: { valid: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-xs">
    {valid ? <Check className="h-3 w-3 text-emerald-400" /> : <X className="h-3 w-3 text-slate-600" />}
    <span className={valid ? 'text-emerald-400' : 'text-slate-500'}>{label}</span>
  </div>
);

export const RegisterForm = ({ portal, loginUrl, title, subtitle }: RegisterFormProps) => {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passwordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isSpanish = portal === 'buy';
  const portalValue = portal;
  const submitLabel = isSpanish ? 'Crear Cuenta' : portal === 'sell' ? 'Create Account' : 'Create Account';

  const { execute, status } = useAction(register, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      showAlert.error(
        'Error',
        error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al registrarse' : 'Registration failed'),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({ fullName, email, password, confirmPassword, portal: portalValue });
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
          <Label htmlFor="fullName" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Nombre completo' : 'Full Name'}
          </Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="John Doe"
            required
            disabled={status === 'executing'}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

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
            disabled={status === 'executing'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm font-medium text-slate-300">
            {isSpanish ? 'Contraseña' : 'Password'}
          </Label>
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
          {password && (
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500 uppercase">{isSpanish ? 'Requisitos' : 'Requirements'}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <PasswordCheckItem valid={checks.length} label={isSpanish ? '8+ caracteres' : '8+ chars'} />
                <PasswordCheckItem valid={checks.uppercase} label={isSpanish ? 'Mayúscula' : 'Uppercase'} />
                <PasswordCheckItem valid={checks.lowercase} label={isSpanish ? 'Minúscula' : 'Lowercase'} />
                <PasswordCheckItem valid={checks.number} label={isSpanish ? 'Número' : 'Number'} />
                <PasswordCheckItem valid={checks.special} label={isSpanish ? 'Especial' : 'Special'} />
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
            className="h-12 rounded-xl border border-slate-700/50 bg-slate-800/30 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-400">{isSpanish ? 'Las contraseñas no coinciden' : 'Passwords do not match'}</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={status === 'executing' || !passwordValid || !passwordsMatch}
        >
          {status === 'executing' ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Creando...' : 'Creating...'}
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        {isSpanish ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
        <Link href={loginUrl} className="font-medium text-emerald-400 hover:text-emerald-300">
          {isSpanish ? 'Iniciar sesión' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
};
