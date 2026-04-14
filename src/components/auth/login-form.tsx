'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';
import { login } from '@/actions';
import type { LoginFormProps } from '@/types';

export function LoginForm({
  portal,
  title,
  subtitle,
  forgotPasswordUrl,
  emailPlaceholder = 'you@example.com',
  registerUrl,
  registerPrompt = "Don't have an account?",
  registerLinkText = 'Sign up',
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The portal prop is now consistent with the values the server action expects
  const portalValue = portal;

  const { execute, status } = useAction(login, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      const isSpanish = portal === 'buy' || portal === 'admin';
      setError(error.serverError || error.validationErrors?._errors?.[0] || (isSpanish ? 'Error al iniciar sesión' : 'Login failed'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ email, password, portal: portalValue });
  };

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-base">{subtitle}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portalValue} />

          <div className="space-y-2">
            <Label htmlFor="email">{portal === 'buy' || portal === 'admin' ? 'Correo electrónico' : 'Email'}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={emailPlaceholder}
              required
              disabled={status === 'executing'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{portal === 'buy' || portal === 'admin' ? 'Contraseña' : 'Password'}</Label>
              <Link href={forgotPasswordUrl} className="text-primary text-sm font-medium hover:underline">
                {portal === 'buy' || portal === 'admin' ? '¿Olvidaste tu contraseña?' : 'Forgot password?'}
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
            />
          </div>

          <Button type="submit" className="w-full" disabled={status === 'executing'}>
            {status === 'executing' ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {portal === 'buy' || portal === 'admin' ? 'Iniciando sesión...' : 'Signing in...'}
              </>
            ) : portal === 'buy' || portal === 'admin' ? (
              'Iniciar Sesión'
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {registerUrl && (
          <p className="text-muted-foreground text-base">
            {registerPrompt}{' '}
            <Link href={registerUrl} className="text-primary font-medium hover:underline">
              {registerLinkText}
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
