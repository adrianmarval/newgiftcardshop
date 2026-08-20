'use client';

import { useSyncExternalStore } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePasskeySignIn } from './use-passkey-sign-in';
import { isWebAuthnSupported } from './passkey-utils';
import type { AppSection } from '@/types';

interface PasskeySignInButtonProps {
  portal: AppSection;
  isSpanish: boolean;
  disabled?: boolean;
}

const subscribeNoop = () => () => {};

/**
 * Botón "Continuar con passkey" + divisor. Se oculta por completo si el
 * navegador/contexto no soporta WebAuthn (ej. iframes cross-origin).
 */
export function PasskeySignInButton({ portal, isSpanish, disabled }: PasskeySignInButtonProps) {
  const { signInWithPasskey, isPending } = usePasskeySignIn(portal, isSpanish);
  // Detección SSR-safe de soporte WebAuthn: snapshot false en server,
  // valor real en cliente (evita hydration mismatch y setState en effect).
  const supported = useSyncExternalStore(subscribeNoop, isWebAuthnSupported, () => false);

  if (!supported) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-700/50" />
        <span className="text-[11px] text-slate-500 sm:text-xs">{isSpanish ? 'o' : 'or'}</span>
        <span className="h-px flex-1 bg-slate-700/50" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-10 w-full rounded-xl border-slate-700/50 bg-slate-800/30 text-xs font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white sm:h-12 sm:text-sm"
        disabled={disabled || isPending}
        onClick={() => void signInWithPasskey()}
      >
        {isPending ? (
          <span className="flex items-center gap-1">
            <Spinner size="sm" className="text-white" />
            {isSpanish ? 'Verificando...' : 'Verifying...'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-emerald-400" />
            {isSpanish ? 'Continuar con Huella (Passkey)' : 'Continue with Fingerprint (Passkey)'}
          </span>
        )}
      </Button>
    </div>
  );
}
