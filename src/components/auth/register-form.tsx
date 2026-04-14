'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Check, X } from 'lucide-react';
import { register } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { RegisterFormProps } from '@/types';

const PasswordCheckItem = ({ valid, label }: { valid: boolean; label: string }) => {
  return (
    <div className="flex items-center gap-2 text-base">
      {valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="text-muted-foreground h-4 w-4" />}
      <span className={valid ? 'text-green-600' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
};

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
  const passwordsMatch = password === confirmPassword;

  const isSpanish = portal === 'buy';
  const portalValue = portal;
  const submitLabel = isSpanish ? 'Crear Cuenta' : portal === 'sell' ? 'Create Seller Account' : 'Create Account';
  const signInText = isSpanish ? '¿Ya tienes una cuenta?' : 'Already have an account?';

  const { execute, status } = useAction(register, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al registrarse' : 'Registration failed'),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({
      fullName,
      email,
      password,
      confirmPassword,
      portal: portalValue,
    });
  };

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-base">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portalValue} />

          <div className="space-y-2">
            <Label htmlFor="fullName">{isSpanish ? 'Nombre completo' : 'Full Name'}</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              required
              disabled={status === 'executing'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{isSpanish ? 'Correo electrónico' : 'Email'}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={status === 'executing'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isSpanish ? 'Contraseña' : 'Password'}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={status === 'executing'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="bg-muted mt-2 space-y-2 rounded-md p-3">
              <p className="text-sm font-medium">{isSpanish ? 'Requisitos de contraseña:' : 'Password requirements:'}</p>
              <PasswordCheckItem valid={checks.length} label={isSpanish ? 'Al menos 8 caracteres' : 'At least 8 characters'} />
              <PasswordCheckItem valid={checks.uppercase} label={isSpanish ? 'Letra mayúscula' : 'Uppercase letter'} />
              <PasswordCheckItem valid={checks.lowercase} label={isSpanish ? 'Letra minúscula' : 'Lowercase letter'} />
              <PasswordCheckItem valid={checks.number} label={isSpanish ? 'Un número' : 'Number'} />
              <PasswordCheckItem valid={checks.special} label={isSpanish ? 'Carácter especial' : 'Special character'} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{isSpanish ? 'Confirmar contraseña' : 'Confirm Password'}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={status === 'executing'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={status === 'executing' || !passwordValid || !passwordsMatch}>
            {status === 'executing' ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {isSpanish ? 'Creando cuenta...' : 'Creating account...'}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-base">
          {signInText}{' '}
          <Link href={loginUrl} className="text-primary font-medium hover:underline">
            {isSpanish ? 'Iniciar sesión' : 'Sign in'}
          </Link>
        </p>
      </div>
    </Card>
  );
};
