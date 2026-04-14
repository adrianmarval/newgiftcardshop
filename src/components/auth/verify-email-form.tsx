'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, Mail } from 'lucide-react';
import { verifyEmail, resendVerification } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import type { Portal } from '@/types';

const VerifyEmailFormContent = ({ portal = 'buy' }: { portal?: Portal }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [resendSuccess, setResendSuccess] = useState(false);

  const isSpanish = portal === 'buy' || portal === 'admin';

  const { execute: verifyExecute, status: verifyStatus } = useAction(verifyEmail, {
    onSuccess: ({ data }) => {
      if (data?.success && data.redirectTo) {
        router.push(data.redirectTo);
      }
    },
    onError: ({ error }) => {
      const defaultError = isSpanish ? 'La verificación falló' : 'Verification failed';
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
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
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  // If we have a token, show verify button
  if (token) {
    const handleVerify = () => {
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

          <div className="space-y-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="token" value={token} />

            <Button type="button" onClick={handleVerify} className="h-11 w-full font-semibold" disabled={verifyStatus === 'executing'}>
              {verifyStatus === 'executing' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
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

        {resendSuccess && (
          <Card className="border-primary/50 bg-primary/5 text-primary p-4">
            <CheckCircle className="mb-2 h-4 w-4" />
            <span>
              {isSpanish
                ? '¡Correo de verificación reenviado! Revisa tu bandeja de entrada.'
                : 'Verification email resent! Check your inbox.'}
            </span>
          </Card>
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
                  <Spinner size="sm" className="mr-2" />
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
};

export const VerifyEmailForm = ({ portal = 'buy' }: { portal?: Portal }) => {
  const isSpanish = portal === 'buy' || portal === 'admin';
  return (
    <Suspense fallback={<div>{isSpanish ? 'Cargando...' : 'Loading...'}</div>}>
      <VerifyEmailFormContent portal={portal} />
    </Suspense>
  );
};
