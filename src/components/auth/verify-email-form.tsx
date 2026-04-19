'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, Mail, RefreshCw } from 'lucide-react';
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
      const defaultError = isSpanish ? 'Error al reenviar' : 'Failed to resend';
      toast.error(error.serverError || error.validationErrors?._errors?.[0] || defaultError);
    },
  });

  if (token) {
    const handleVerify = () => {
      verifyExecute({ portal, token });
    };

    return (
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white">{isSpanish ? 'Verifica tu Correo' : 'Verify Your Email'}</h1>
          <p className="text-sm text-slate-400">
            {isSpanish ? 'Haz clic abajo para completar la verificación' : 'Click below to complete verification'}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleVerify}
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 focus:ring-emerald-500/50"
          disabled={verifyStatus === 'executing'}
        >
          {verifyStatus === 'executing' ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Verificando...' : 'Verifying...'}
            </span>
          ) : isSpanish ? (
            'Verificar Correo'
          ) : (
            'Verify Email'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Mail className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-medium tracking-tight text-white">{isSpanish ? 'Revisa tu Correo' : 'Check Your Email'}</h1>
        {email && (
          <p className="text-sm text-slate-400">
            {isSpanish ? 'Enviamos un enlace a' : 'We sent a link to'} <span className="font-medium text-emerald-400">{email}</span>
          </p>
        )}
      </div>

      {resendSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">
            {isSpanish ? '¡Correo reenviado! Revisa tu bandeja.' : 'Email resent! Check your inbox.'}
          </p>
        </div>
      )}

      {email && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setResendSuccess(false);
            resendExecute({ portal, email });
          }}
          className="h-12 w-full rounded-xl border-slate-700/50 bg-slate-800/30 text-sm font-medium text-slate-300 hover:bg-slate-800/50"
          disabled={resendStatus === 'executing'}
        >
          {resendStatus === 'executing' ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-slate-300" />
              {isSpanish ? 'Reenviando...' : 'Resending...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {isSpanish ? 'Reenviar Correo' : 'Resend Email'}
            </span>
          )}
        </Button>
      )}
    </div>
  );
};

export const VerifyEmailForm = ({ portal = 'buy' }: { portal?: Portal }) => {
  const isSpanish = portal === 'buy' || portal === 'admin';
  return (
    <Suspense fallback={<div className="text-center text-slate-400">{isSpanish ? 'Cargando...' : 'Loading...'}</div>}>
      <VerifyEmailFormContent portal={portal} />
    </Suspense>
  );
};
