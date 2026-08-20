'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { startAuthentication, WebAuthnError } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { authClient } from '@/lib/auth/auth-client';
import { completePasskeyLogin } from '@/actions/auth/complete-passkey-login';
import { showSwal } from '@/lib/ui';
import { isWebAuthnSupported } from './passkey-utils';
import type { AppSection } from '@/types';

/**
 * Códigos de WebAuthnError que representan cancelación del usuario — NO son
 * errores: el usuario cerró el prompt (nativo o gestor de contraseñas), el
 * autofill fue abortado por una nueva ceremonia, o hubo timeout.
 */
const SILENT_WEBAUTHN_CODES = new Set([
  'ERROR_CEREMONY_ABORTED', // ceremonia abortada por una nueva (ej. autofill → click manual)
  'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', // NotAllowedError: cancelación/timeout del usuario
]);

/**
 * Flujo completo de sign-in con passkey:
 * 1. Ceremonia WebAuthn propia (manual o Conditional UI/autofill) — NO usamos
 *    `authClient.signIn.passkey` porque loguea `console.error` en toda
 *    excepción, incluida la cancelación del usuario (ruido en consola).
 *    Pegamos a los mismos endpoints del plugin con el mismo `$fetch`, así que
 *    cookies de sesión y el refresh de `$sessionSignal` funcionan igual.
 * 2. Guarda de rol/portal server-side (signIn.passkey bypasea la action `login`).
 * 3. Redirect al dashboard del portal.
 */
export function usePasskeySignIn(portal: AppSection, isSpanish: boolean) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const { execute, status } = useAction(completePasskeyLogin, {
    onSuccess: ({ data }) => {
      if (!data) return;
      if ('redirectTo' in data && data.redirectTo) {
        router.push(data.redirectTo);
      } else if ('error' in data && data.error) {
        showSwal.fire({ icon: 'error', title: 'Error', text: data.error });
      }
    },
    onError: ({ error }) => {
      showSwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.serverError || (isSpanish ? 'Error al iniciar sesión' : 'Login failed'),
      });
    },
  });

  const signInWithPasskey = useCallback(
    async (options?: { autoFill?: boolean }) => {
      const autoFill = options?.autoFill === true;
      // Con autoFill la promesa queda pendiente hasta que el usuario elige
      // una passkey del autofill — no debe bloquear el formulario.
      if (!autoFill) setIsPending(true);
      try {
        const optionsRes = await authClient.$fetch<PublicKeyCredentialRequestOptionsJSON>('/passkey/generate-authenticate-options', {
          method: 'GET',
          throw: false,
        });
        if (!optionsRes.data) {
          showSwal.fire({
            icon: 'error',
            title: 'Error',
            text: isSpanish ? 'No se pudo iniciar la verificación' : 'Could not start verification',
          });
          return;
        }

        const response = await startAuthentication({
          optionsJSON: optionsRes.data,
          useBrowserAutofill: autoFill,
        });

        const verified = await authClient.$fetch<{ session: unknown; user: unknown }>('/passkey/verify-authentication', {
          method: 'POST',
          body: { response },
          throw: false,
        });
        if (verified.error) {
          showSwal.fire({
            icon: 'error',
            title: 'Error',
            text: isSpanish ? 'No se pudo verificar la passkey' : 'Passkey verification failed',
          });
          return;
        }

        execute({ portal });
      } catch (err) {
        // Cancelación del usuario: silencio total. Cualquier otra cosa: error.
        if (err instanceof WebAuthnError && SILENT_WEBAUTHN_CODES.has(err.code)) return;
        showSwal.fire({
          icon: 'error',
          title: 'Error',
          text: isSpanish ? 'No se pudo verificar la passkey' : 'Passkey verification failed',
        });
      } finally {
        if (!autoFill) setIsPending(false);
      }
    },
    [execute, portal, isSpanish]
  );

  // Conditional UI: la passkey aparece en el autofill del campo de email
  // (requiere autocomplete="username webauthn" en el input).
  useEffect(() => {
    if (!isWebAuthnSupported() || !PublicKeyCredential.isConditionalMediationAvailable) return;
    void PublicKeyCredential.isConditionalMediationAvailable()
      .then((available) => {
        if (available) void signInWithPasskey({ autoFill: true });
      })
      .catch(() => undefined);
  }, [signInWithPasskey]);

  return { signInWithPasskey, isPending: isPending || status === 'executing' };
}
