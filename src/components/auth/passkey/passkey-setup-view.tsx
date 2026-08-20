'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Zap, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth/auth-client';
import { showSwal } from '@/lib/ui';
import { getDeviceName, isPasskeyCancellation, isPlatformAuthenticatorAvailable, markPasskeySetupDone } from './passkey-utils';
import { dashboardMap } from '@/types';
import type { AppSection } from '@/types';

interface PasskeySetupViewProps {
  portal: AppSection;
}

/**
 * Vista intersticial post-login para registrar una passkey.
 *
 * La página server ya garantiza: sesión válida + sin passkeys + sin dismissal.
 * Aquí solo queda verificar soporte de WebAuthn (si no hay autenticador de
 * plataforma, auto-redirect — nadie ve una vista que no puede usar) y
 * ejecutar la ceremonia de registro.
 */
export function PasskeySetupView({ portal }: PasskeySetupViewProps) {
  const router = useRouter();
  const isSpanish = portal === 'buy' || portal === 'admin';
  const dashboard = dashboardMap[portal];

  // 'checking' evita flashear la vista antes de saber si el dispositivo soporta passkeys
  const [supported, setSupported] = useState<boolean | 'checking'>('checking');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isPlatformAuthenticatorAvailable().then((available) => {
      if (cancelled) return;
      if (!available) {
        router.replace(dashboard);
      } else {
        setSupported(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, dashboard]);

  const goToDashboard = () => {
    markPasskeySetupDone();
    router.push(dashboard);
  };

  const handleSetup = async () => {
    setIsRegistering(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ name: getDeviceName(isSpanish) });
      if (error) {
        // El usuario cancelando la ceremonia no es un error — se queda en la vista.
        if (isPasskeyCancellation(error)) return;
        // Ya registrada en este dispositivo: objetivo cumplido, al dashboard.
        if ('code' in error && error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
          goToDashboard();
          return;
        }
        showSwal.fire({
          icon: 'error',
          title: 'Error',
          text:
            (typeof error.message === 'string' ? error.message : undefined) ||
            (isSpanish ? 'No se pudo registrar la passkey' : 'Failed to register passkey'),
        });
        return;
      }
      goToDashboard();
    } finally {
      setIsRegistering(false);
    }
  };

  if (supported !== true) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const benefits = [
    {
      icon: Zap,
      text: isSpanish ? 'Inicia sesión en segundos, sin escribir tu contraseña' : 'Sign in in seconds, no password typing',
    },
    {
      icon: ShieldCheck,
      text: isSpanish ? 'Protección contra phishing — tu passkey nunca sale del dispositivo' : 'Phishing-proof — your passkey never leaves the device',
    },
    {
      icon: KeyRound,
      text: isSpanish ? 'Usa tu huella, rostro o PIN del dispositivo' : 'Use your fingerprint, face or device PIN',
    },
  ];

  return (
    <div className="space-y-6 text-center sm:space-y-8">
      <div className="space-y-1">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 sm:mb-6">
          <Fingerprint className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
          {isSpanish ? 'Inicia sesión más rápido' : 'Sign in faster'}
        </h1>
        <p className="text-xs text-slate-400 sm:text-sm">
          {isSpanish
            ? 'Configura una passkey y entra con tu huella o rostro'
            : 'Set up a passkey and sign in with your fingerprint or face'}
        </p>
      </div>

      <ul className="space-y-3 text-left">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2.5 sm:px-4 sm:py-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-xs text-slate-300 sm:text-sm">{text}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <Button
          type="button"
          className="h-10 w-full rounded-xl bg-emerald-500 text-xs font-semibold hover:bg-emerald-400 focus:ring-emerald-500/50 sm:h-12 sm:text-sm"
          disabled={isRegistering}
          onClick={() => void handleSetup()}
        >
          {isRegistering ? (
            <span className="flex items-center gap-1">
              <Spinner size="sm" className="text-white" />
              {isSpanish ? 'Configurando...' : 'Setting up...'}
            </span>
          ) : isSpanish ? (
            'Configurar passkey'
          ) : (
            'Set up passkey'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 sm:text-sm"
          disabled={isRegistering}
          onClick={goToDashboard}
        >
          {isSpanish ? 'Ahora no' : 'Not now'}
        </Button>
      </div>
    </div>
  );
}
