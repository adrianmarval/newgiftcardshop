import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { authClient } from '@/lib/auth/auth-client';

/**
 * Nombre legible para una passkey basado en la plataforma del dispositivo.
 * Se usa al registrar passkeys para que el usuario las identifique en ajustes.
 */export function getDeviceName(isSpanish: boolean): string {
  if (typeof navigator === 'undefined') return isSpanish ? 'Este dispositivo' : 'This device';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return isSpanish ? 'Este dispositivo' : 'This device';
}

/** `true` si el navegador expone la API WebAuthn. */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

/** `true` si hay un autenticador de plataforma (Touch ID, Face ID, Windows Hello, PIN). */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported() || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Códigos de WebAuthnError que representan cancelación del usuario — NO son
 * errores: cerró el prompt (nativo o gestor de contraseñas) o hubo timeout.
 * Verificado en simplewebauthn: el passthrough solo envuelve NotAllowedError.
 */
const PASSKEY_CANCEL_CODES = new Set(['ERROR_CEREMONY_ABORTED', 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY']);

/** `true` si el error de una ceremonia WebAuthn es una cancelación del usuario. */
export function isPasskeyCancellation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const { code } = error as Record<string, unknown>;
  return typeof code === 'string' && PASSKEY_CANCEL_CODES.has(code);
}

/**
 * Ceremonia WebAuthn de autenticación contra los endpoints del plugin
 * (`generate-authenticate-options` + `verify-authentication`), sin el wrapper
 * `authClient.signIn.passkey` (que loguea console.error en cancelaciones).
 *
 * Uso: re-autenticación dentro de la sesión (ej. desbloqueo de códigos).
 * Devuelve el `userId` dueño de la passkey verificada.
 *
 * OJO: `verify-authentication` responde `{ session }` (NO incluye `user`,
 * aunque el OpenAPI del plugin diga lo contrario) — el userId sale de la sesión.
 *
 * @throws WebAuthnError — el caller decide si es cancelación (isPasskeyCancellation)
 * @throws Error — si el servidor no genera opciones o la verificación falla
 */
export async function runPasskeyAuthentication(): Promise<string> {
  const optionsRes = await authClient.$fetch<PublicKeyCredentialRequestOptionsJSON>('/passkey/generate-authenticate-options', {
    method: 'GET',
    throw: false,
  });
  if (!optionsRes.data) throw new Error('No se pudo iniciar la verificación con passkey');

  const response = await startAuthentication({ optionsJSON: optionsRes.data });

  const verified = await authClient.$fetch<{ session?: { userId?: string } }>('/passkey/verify-authentication', {
    method: 'POST',
    body: { response },
    throw: false,
  });
  const userId = verified.data?.session?.userId;
  if (verified.error || !userId) throw new Error('No se pudo verificar la passkey');
  return userId;
}
