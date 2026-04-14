'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { forgotPassword } from '@/actions';
import { useAction } from 'next-safe-action/hooks';

export function ForgotPasswordForm({ portal = 'buy' }: { portal?: 'admin' | 'buy' | 'sell' }) {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = portal === 'buy' || portal === 'admin';
  const portalPath = portal === 'buy' ? '/buy' : `/${portal}`;
  const authPath = `${portalPath}/auth`;

  const { execute, status } = useAction(forgotPassword, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setSuccess(true);
        setError(null);
      }
    },
    onError: ({ error }) => {
      setError(
        error.serverError ||
          error.validationErrors?._errors?.[0] ||
          (isSpanish ? 'Error al enviar el enlace de restablecimiento' : 'Failed to send reset link'),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    execute({ email, portal });
  };

  return (
    <Card className="mx-auto w-full max-w-md border-none bg-transparent p-8 shadow-none">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{isSpanish ? 'Olvidé mi Contraseña' : 'Forgot Password'}</h1>
          <p className="text-muted-foreground text-base">
            {isSpanish
              ? 'Ingresa tu correo para recibir un enlace de restablecimiento de contraseña'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>
              {isSpanish
                ? 'Si existe una cuenta con ese correo, se ha enviado un enlace de restablecimiento. Revisa tu bandeja de entrada.'
                : 'If an account exists with that email, a reset link has been sent. Check your inbox.'}
            </span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold tracking-wider uppercase opacity-70">
              {isSpanish ? 'Dirección de Correo' : 'Email Address'}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={status === 'executing' || success}
              className="bg-muted/50 h-11 border-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 w-full font-semibold" disabled={status === 'executing' || success}>
            {status === 'executing' ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {isSpanish ? 'Enviando...' : 'Sending...'}
              </>
            ) : isSpanish ? (
              'Enviar Enlace'
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-base">
          {isSpanish ? '¿Recordaste tu contraseña?' : 'Remember your password?'}{' '}
          <Link href={`${authPath}/login`} className="text-primary font-semibold hover:underline">
            {isSpanish ? 'Iniciar sesión' : 'Sign in'}
          </Link>
        </p>
      </div>
    </Card>
  );
}
