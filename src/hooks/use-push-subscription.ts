'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { savePushSubscription, deletePushSubscription } from '@/actions/notifications';
import { getPortalSwScope } from '@/lib/utils';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

// Scope legacy: antes el SW de push se registraba en `/` (raíz). Esas
// suscripciones NO se atribuyen a la PWA instalada (scope fuera del WebAPK)
// → Android las muestra con ícono/nombre de Chrome. Se migran al scope del portal.
const LEGACY_SW_SCOPE = '/';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Brave desactiva el push service (FCM) por defecto → subscribe() falla con
// "push service error". Se detecta para mostrar instrucciones específicas.
async function isBraveBrowser(): Promise<boolean> {
  try {
    const nav = navigator as { brave?: { isBrave?: () => Promise<boolean> } };
    return (await nav.brave?.isBrave?.()) === true;
  } catch {
    return false;
  }
}

/**
 * Registra el SW de push con el scope del portal y espera a que esté activo.
 * NO usar navigator.serviceWorker.ready: resuelve por la URL de la página y
 * puede traer otra registration (ej. páginas fuera del scope del portal).
 */
async function registerPushSw(scope: string): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js', { scope });
  if (registration.active) return registration;

  // Suscribir sobre una registration aún en "installing" falla con
  // "push service error" en Chrome → esperar a "activated" (con timeout de
  // seguridad: si un worker viejo retiene la activación, subscribe reintenta)
  const worker = registration.installing ?? registration.waiting;
  if (worker) {
    await Promise.race([
      new Promise<void>((resolve) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
        });
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);
  }
  return registration;
}

// Chrome a veces falla el primer subscribe tras activar el SW con un
// "push service error" transitorio → reintentar con backoff
async function subscribeWithRetry(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('vapid_not_configured');

  let subscription: PushSubscription | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3 && !subscription; attempt++) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (!subscription) throw lastError;
  return subscription;
}

async function persistSubscription(subscription: PushSubscription): Promise<{ ok: boolean; error?: string }> {
  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) return { ok: false, error: 'invalid_subscription' };

  const response = await savePushSubscription({
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: navigator.userAgent.slice(0, 300),
  });

  if (!response?.data?.success) {
    return { ok: false, error: response?.serverError || 'save_failed' };
  }
  return { ok: true };
}

/**
 * Desuscribe la suscripción legacy (scope `/`) si existe y es distinta de la
 * registration actual, limpiando también la DB. El endpoint cambia por
 * registration, así que la suscripción nueva no colisiona con la vieja.
 */
async function dropLegacySubscription(current: ServiceWorkerRegistration): Promise<void> {
  try {
    const legacy = await navigator.serviceWorker.getRegistration(LEGACY_SW_SCOPE);
    if (!legacy || legacy.scope === current.scope) return;

    const legacySub = await legacy.pushManager.getSubscription();
    if (!legacySub) return;

    await legacySub.unsubscribe();
    await deletePushSubscription({ endpoint: legacySub.endpoint });
  } catch {
    // La migración es best-effort: el endpoint viejo muere solo (404/410)
  }
}

/**
 * Maneja la suscripción Web Push del navegador:
 * - Registra /sw.js con el scope del portal y sincroniza el estado con la
 *   suscripción real del navegador
 * - Migra silenciosamente suscripciones legacy (scope `/`) al scope del portal
 *   para que Android atribuya las notificaciones a la PWA y no a Chrome
 * - `enable()` pide permiso (requiere gesto del usuario), suscribe y persiste en DB
 * - `disable()` desuscribe y elimina de la DB
 */
export function usePushSubscription(initialEnabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribed, setSubscribed] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const pathname = usePathname();
  const swScope = getPortalSwScope(pathname);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    setPermission(Notification.permission as PushPermission);

    (async () => {
      try {
        const registration = await registerPushSw(swScope);
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setSubscribed(true);
          await dropLegacySubscription(registration);
          return;
        }

        // Migración silenciosa: suscripción activa en la registration legacy →
        // re-suscribir en el scope del portal sin pedir permiso (ya concedido)
        if (Notification.permission === 'granted') {
          const legacy = await navigator.serviceWorker.getRegistration(LEGACY_SW_SCOPE);
          const legacySub =
            legacy && legacy.scope !== registration.scope
              ? await legacy.pushManager.getSubscription()
              : null;

          if (legacySub) {
            const newSub = await subscribeWithRetry(registration);
            const result = await persistSubscription(newSub);
            if (result.ok) {
              await legacySub.unsubscribe();
              await deletePushSubscription({ endpoint: legacySub.endpoint });
              setSubscribed(true);
              return;
            }
          }
        }

        setSubscribed(false);
      } catch {
        // Sync de estado best-effort — la UI queda con el estado inicial del servidor
      }
    })();
  }, [swScope]);

  const enable = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== 'granted') return { ok: false, error: 'permission_denied' };

      const registration = await registerPushSw(swScope);

      // La suscripción vieja (scope `/`) se descarta: seguiría mostrando Chrome
      await dropLegacySubscription(registration);

      const subscription = await subscribeWithRetry(registration);
      const persisted = await persistSubscription(subscription);
      if (!persisted.ok) return persisted;

      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Brave desactiva el push service (FCM) por defecto → subscribe() falla
      // con "push service error". Devolver un código específico para que la UI
      // muestre instrucciones (brave://settings/privacy → Google push services).
      if (/push service error/i.test(message) && (await isBraveBrowser())) {
        return { ok: false, error: 'brave_push_service_disabled' };
      }
      if (message === 'vapid_not_configured') return { ok: false, error: message };

      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [swScope]);

  const disable = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      // Limpiar la suscripción del portal y cualquier remanente legacy
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deletePushSubscription({ endpoint: subscription.endpoint });
        }
      }

      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, enable, disable };
}
