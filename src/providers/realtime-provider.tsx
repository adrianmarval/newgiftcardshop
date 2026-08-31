'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RealtimeKey } from '@/lib/realtime/bus';

/**
 * RealtimeProvider — reemplaza el polling ciego de AutoRefreshProvider.
 *
 * Escucha /api/realtime (SSE) y, ante una señal de invalidación, hace
 * router.refresh() SOLO si las keys del evento intersectan las de la ruta
 * actual. El socket nunca transporta data — la fuente de verdad sigue
 * siendo el servidor (RSC + Prisma + gates).
 *
 * Safety nets:
 * - Reconexión: EventSource reintenta solo; en `onopen` tras una caída se
 *   hace un refresh incondicional (resync de frames perdidos).
 * - Poll lento SIEMPRE activo (5min, solo con tab visible): convergencia
 *   eventual ante un emit point que se haya escapado.
 * - Refreshes pausados con el tab oculto (el refresh corre al volver).
 *
 * La conexión SSE es ESTABLE por la vida del provider: NO se recrea al
 * navegar entre páginas (un cierre/reapertura por soft-nav genera churn de
 * suscripciones al bus y ruido ERR "stream canceled" en proxies/tunnels).
 * Las keys de la ruta actual viven en un ref que onmessage lee en vivo.
 */

const ALL_KEYS: RealtimeKey[] = [
  'notifications',
  'orders',
  'batches',
  'availability',
  'payments',
  'stats',
  'users',
  'catalog',
  'settings',
];

/** Mapa ruta → keys que esa ruta consume. Match por prefijo. */
const ROUTE_KEYS: Array<[prefix: string, keys: RealtimeKey[]]> = [
  ['/sell/dashboard/sell-cards', ['batches', 'stats', 'notifications']],
  ['/sell/dashboard/cards', ['batches', 'stats', 'notifications']],
  ['/sell/dashboard', ['batches', 'stats', 'notifications']],
  ['/store/dashboard/browse-cards', ['availability', 'orders', 'notifications']],
  ['/store/dashboard/orders', ['orders', 'notifications']],
  ['/store/dashboard', ['availability', 'orders', 'stats', 'notifications']],
  ['/admin/dashboard', [...ALL_KEYS]],
];

const DEFAULT_KEYS: RealtimeKey[] = ['notifications'];

/** Poll de safety net (no el mecanismo principal — eso es el SSE). */
const SAFETY_POLL_MS = 5 * 60 * 1000;
/** Throttle de refreshes para ráfagas de eventos. */
const REFRESH_THROTTLE_MS = 1_000;

function keysForPath(pathname: string): RealtimeKey[] {
  for (const [prefix, keys] of ROUTE_KEYS) {
    if (pathname.startsWith(prefix)) return keys;
  }
  return DEFAULT_KEYS;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshAt = useRef(0);
  // Keys de la ruta actual, leídas en vivo por onmessage sin recrear el socket
  const routeKeysRef = useRef<RealtimeKey[]>(keysForPath(pathname));

  useEffect(() => {
    routeKeysRef.current = keysForPath(pathname);
  }, [pathname]);

  // Mount-only: UNA conexión SSE por la vida del provider (ver docblock)
  useEffect(() => {
    let hadDisconnect = false;

    const throttledRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    // Al volver al tab: resync por si hubo eventos mientras estaba oculto
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastRefreshAt.current = 0;
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Safety net: convergencia eventual ante emit points perdidos
    const safetyPoll = setInterval(throttledRefresh, SAFETY_POLL_MS);

    const source = new EventSource('/api/realtime');

    source.onopen = () => {
      if (hadDisconnect) {
        // Resync: entre la caída y el reconnect pudimos perder frames
        hadDisconnect = false;
        lastRefreshAt.current = 0;
        router.refresh();
      }
    };

    source.onmessage = (message) => {
      try {
        const { keys } = JSON.parse(message.data as string) as { keys: RealtimeKey[] };
        if (keys.some((key) => routeKeysRef.current.includes(key))) {
          throttledRefresh();
        }
      } catch {
        // Frame malformado — ignorar
      }
    };

    source.onerror = () => {
      hadDisconnect = true;
      // EventSource reintenta automáticamente; el safety poll cubre el limbo
    };

    return () => {
      source.close();
      clearInterval(safetyPoll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router]);

  return <>{children}</>;
}
