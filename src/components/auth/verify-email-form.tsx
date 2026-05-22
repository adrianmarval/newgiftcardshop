'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle, Mail, XCircle, ArrowRight } from 'lucide-react';
import { appSectionMap, dashboardMap, type AppSection } from '@/types';

const VerifyEmailFormContent = ({ portal = 'buy' }: { portal?: AppSection }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('loading');

  const isSpanish = portal === 'buy' || portal === 'admin';
  const targetDashboard = dashboardMap[portal];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      setStatus('error');
    } else if (token) {
      setStatus('success');
    } else {
      setStatus('idle');
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-400" />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white">{isSpanish ? '¡Correo Verificado!' : 'Email Verified!'}</h1>
          <p className="text-sm text-slate-400">
            {isSpanish ? 'Tu email ha sido confirmado exitosamente.' : 'Your email has been confirmed successfully.'}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => router.push(targetDashboard)}
          className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          <span className="flex items-center gap-2">
            {isSpanish ? 'Ir al Dashboard' : 'Go to Dashboard'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white">{isSpanish ? 'Verificación Fallida' : 'Verification Failed'}</h1>
          <p className="text-sm text-slate-400">
            {isSpanish
              ? 'El enlace expiró o es inválido. Contacta a soporte para más ayuda.'
              : 'The link expired or is invalid. Contact support for help.'}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`${appSectionMap[portal]}/auth/login`)}
          className="h-12 w-full text-sm text-slate-400 hover:text-white"
        >
          {isSpanish ? 'Volver al Login' : 'Back to Login'}
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
        <p className="text-sm text-slate-400">
          {isSpanish
            ? 'Te enviamos un enlace de verificación. Revisa tu bandeja de entrada.'
            : 'We sent you a verification link. Check your inbox.'}
        </p>
      </div>
    </div>
  );
};

export const VerifyEmailForm = ({ portal = 'buy' }: { portal?: AppSection }) => {
  return <VerifyEmailFormContent portal={portal} />;
};
