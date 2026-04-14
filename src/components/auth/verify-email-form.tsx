'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { verifyEmail, resendVerification } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import { Suspense } from 'react';
import type { Portal } from '@/types';

function VerifyEmailFormContent({ portal = 'buy' }: { portal?: Portal }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = portal === 'buy' || portal === 'admin';

  const { execute: verifyExecute, status: verifyStatus } = useAction(verifyEmail, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'La verificación falló' : 'Verification failed';
      setError(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  const { execute: resendExecute, status: resendStatus } = useAction(resendVerification, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setResendSuccess(true);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'Error al reenviar la verificación' : 'Failed to resend verification';
      setError(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  // If we have a token, show verify button
  if (token) {
    const handleVerify = () => {
      setError(null);
      verifyExecute({ portal, token });
    };

    return (
      <Card className="mx-auto w-full max-w-md border-none bg-transparent p-8 shadow-none">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <CheckCircle className="text-primary mx-auto h-12 w-12" />
            <h1 className="text-3xl font-bold">{isSpanish ? 'Verifica tu Correo' : 'Verify Your Email'}</h1>
            <p className="text-muted-foreground text-base">
              {isSpanish ? 'Haz clic abajo para completar la verificación de tu correo' : 'Click below to complete your email verification'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}

          <div className="space-y-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="token" value={token} />

            <Button type="button" onClick={handleVerify} className="h-11 w-full font-semibold" disabled={verifyStatus === 'executing'}>
              {verifyStatus === 'executing' ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isSpanish ? 'Verificando...' : 'Verifying...'}
                </>
              ) : isSpanish ? (
                'Verificar Correo'
              ) : (
                'Verify Email'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // If no token, show pending verification state with resend option
  const handleResend = () => {
    setError(null);
    setResendSuccess(false);
    resendExecute({ portal, email });
  };

  return (
    <Card className="mx-auto w-full max-w-md border-none bg-transparent p-8 shadow-none">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Mail className="text-primary mx-auto h-12 w-12" />
          <h1 className="text-3xl font-bold">{isSpanish ? 'Revisa tu Correo' : 'Check Your Email'}</h1>
          <p className="text-muted-foreground text-base">
            {isSpanish ? 'Hemos enviado un enlace de verificación a' : "We've sent a verification link to"}
            <br />
            {email && <span className="text-primary font-semibold">{email}</span>}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {resendSuccess && (
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>
              {isSpanish
                ? '¡Correo de verificación reenviado! Revisa tu bandeja de entrada.'
                : 'Verification email resent! Check your inbox.'}
            </span>
          </Alert>
        )}

        {email && (
          <div>
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="email" value={email} />

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              className="bg-muted/30 hover:bg-muted/50 h-11 w-full border-none font-medium"
              disabled={resendStatus === 'executing'}
            >
              {resendStatus === 'executing' ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isSpanish ? 'Reenviando...' : 'Resending...'}
                </>
              ) : isSpanish ? (
                '¿No recibiste el correo? Reenviar'
              ) : (
                "Didn't receive email? Resend"
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function VerifyEmailForm({ portal = 'buy' }: { portal?: Portal }) {
  const isSpanish = portal === 'buy' || portal === 'admin';
  return (
    <Suspense fallback={<div>{isSpanish ? 'Cargando...' : 'Loading...'}</div>}>
      <VerifyEmailFormContent portal={portal} />
    </Suspense>
  );
}
