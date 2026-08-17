'use client';

import { useCallback, useEffect, useState } from 'react';
import { savePushSubscription, deletePushSubscription } from '@/actions/notifications';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

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
 * Maneja la suscripción Web Push del navegador:
 * - Registra /sw.js y sincroniza el estado con la suscripción real del navegador
 * - `enable()` pide permiso (requiere gesto del usuario), suscribe y persiste en DB
 * - `disable()` desuscribe y elimina de la DB
 */
export function usePushSubscription(initialEnabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribed, setSubscribed] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(!!subscription))
      .catch(() => {});
  }, []);

  const enable = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return { ok: false, error: 'vapid_not_configured' };

      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== 'granted') return { ok: false, error: 'permission_denied' };

      // Esperar a que el SW esté activo: suscribir sobre una registration
      // aún en "installing" falla con "push service error" en Chrome
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      // Chrome a veces falla el primer subscribe tras activar el SW con un
      // "push service error" transitorio → reintentar con backoff
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

      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await deletePushSubscription({ endpoint: subscription.endpoint });
      }

      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, enable, disable };
}
