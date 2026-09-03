'use client';

import { startTransition, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeKey } from '@/lib/realtime/bus';
import { REALTIME_QUERY_KEYS, FALLBACK_REFRESH_KEYS } from '@/lib/realtime/query-keys';

/**
 * RealtimeProvider — invalidación dirigida por SSE.
 *
 * Escucha /api/realtime (SSE) y, ante una señal de invalidación:
 *
 * 1. Vistas migradas a TanStack Query (REALTIME_QUERY_KEYS): invalida la
 *    query correspondiente y React Query re-fetchea EN EL LUGAR. El router
 *    NO participa — cero races con la navegación del usuario, cero re-render
 *    de página completa, cero pérdida de scroll/foco/estado local.
 * 2. Keys sin query (stats/catalog/settings — home dashboards): fallback a
 *    router.refresh() scoped por ruta (ROUTE_KEYS).
 * 3. 'notifications' además refresca si la ruta actual ES la página de
 *    notificaciones (NotificationsList sincroniza desde server props).
 *
 * INVARIANTE — el router.refresh() del fallback SIEMPRE va dentro de
 * startTransition: un refresh que cae mientras hay una navegación del
 * usuario en vuelo la ABORTA y la URL revierte (bug del App Router). En
 * transition es baja prioridad y la navegación lo preempta. Las vistas de
 * listas NUNCA deben volver a depender de router.refresh — si una vista
 * necesita frescura, migre a useListQuery.
 *
 * Safety nets:
 * - Reconexión: EventSource reintenta solo; en `onopen` tras una caída se
 *   hace un resync completo (invalidar todo + refresh fallback).
 * - Watchdog anti half-open: proxies/tunnels (cloudflared) pueden dejar de
 *   entregar frames SIN cerrar el TCP — `onerror` nunca dispara y la
 *   reconexión automática nunca arranca. El heartbeat del servidor es un
 *   frame de data OBSERVABLE (`{"type":"ping"}` cada 25s); si pasan >75s
 *   sin frames la conexión se declara muerta y se reconecta manualmente.
 * - Resync lento SIEMPRE activo (5min, solo con tab visible): convergencia
 *   eventual ante un emit point que se haya escapado.
 * - Refreshes pausados con el tab oculto (el resync corre al volver).
 *
 * La conexión SSE es ESTABLE por la vida del provider: NO se recrea al
 * navegar entre páginas (un cierre/reapertura por soft-nav genera churn de
 * suscripciones al bus y ruido ERR "stream canceled" en proxies/tunnels).
 * Las keys/ruta actuales viven en refs que onmessage lee en vivo.
 */

/**
 * Mapa ruta → keys de FALLBACK (router.refresh) que esa ruta consume.
 * Solo quedan las keys sin query asociada (stats/catalog/settings), y SOLO
 * en las home dashboards — las páginas de listas ([] explícito) NO reciben
 * refresh de fondo: su frescura viene de las queries (REALTIME_QUERY_KEYS)
 * y el router ahí queda 100% fuera del camino (cero races con paginación).
 * Match por prefijo, gana el primero.
 */
const ROUTE_KEYS: Array<[prefix: string, keys: RealtimeKey[]]> = [
  ['/sell/dashboard/sell-cards', []],
  ['/sell/dashboard/cards', []],
  ['/sell/dashboard', ['stats']],
  ['/store/dashboard/browse-cards', []],
  ['/store/dashboard/orders', []],
  ['/store/dashboard', ['stats']],
  ['/admin/dashboard', ['stats', 'catalog', 'settings']],
];

const DEFAULT_KEYS: RealtimeKey[] = [];

/** Resync de safety net (no el mecanismo principal — eso es el SSE). */
const SAFETY_POLL_MS = 5 * 60 * 1000;
/** Throttle del router.refresh de fallback. */
const REFRESH_THROTTLE_MS = 1_000;
/**
 * Watchdog anti half-open: tolera ~3 heartbeats perdidos (25s c/u) antes de
 * declarar la conexión muerta en silencio y reconectar manualmente.
 */
const HEARTBEAT_DEAD_MS = 75_000;
const WATCHDOG_INTERVAL_MS = 15_000;

function keysForPath(pathname: string): RealtimeKey[] {
  for (const [prefix, keys] of ROUTE_KEYS) {
    if (pathname.startsWith(prefix)) return keys;
  }
  return DEFAULT_KEYS;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const lastRefreshAt = useRef(0);
  // Keys de fallback y pathname de la ruta actual, leídos en vivo por
  // onmessage sin recrear el socket
  const routeKeysRef = useRef<RealtimeKey[]>(keysForPath(pathname));
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    routeKeysRef.current = keysForPath(pathname);
    pathnameRef.current = pathname;
  }, [pathname]);

  // Mount-only: UNA conexión SSE por la vida del provider (ver docblock)
  useEffect(() => {
    let hadDisconnect = false;
    let stopped = false;
    let source: EventSource | null = null;
    // Último frame recibido (data o ping) — el watchdog lo usa para detectar
    // conexiones half-open (frames dejan de llegar sin que onerror dispare)
    let lastFrameAt = Date.now();

    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      // En transition: update de fondo, la navegación del usuario preempta
      startTransition(() => router.refresh());
    };

    const invalidateKeys = (keys: RealtimeKey[]) => {
      let needsFallbackRefresh = false;
      for (const key of keys) {
        const queryKeys = REALTIME_QUERY_KEYS[key];
        if (queryKeys) {
          for (const queryKey of queryKeys) {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          }
        } else if (FALLBACK_REFRESH_KEYS.includes(key) && routeKeysRef.current.includes(key)) {
          needsFallbackRefresh = true;
        }
        // La página de notificaciones sincroniza su lista desde server props
        if (key === 'notifications' && pathnameRef.current.endsWith('/notifications')) {
          needsFallbackRefresh = true;
        }
      }
      if (needsFallbackRefresh) throttledRefresh();
    };

    // Resync completo: invalida TODO + refresh fallback (frames perdidos,
    // vuelta de tab oculto, convergencia del safety poll)
    const resyncAll = () => {
      if (document.visibilityState === 'hidden') return;
      for (const queryKeys of Object.values(REALTIME_QUERY_KEYS)) {
        for (const queryKey of queryKeys) {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      }
      lastRefreshAt.current = 0;
      throttledRefresh();
    };

    // Al volver al tab: resync por si hubo eventos mientras estaba oculto
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resyncAll();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Safety net: convergencia eventual ante emit points perdidos
    const safetyPoll = setInterval(resyncAll, SAFETY_POLL_MS);

    const connect = () => {
      if (stopped) return;
      lastFrameAt = Date.now();
      const es = new EventSource('/api/realtime');
      source = es;

      es.onopen = () => {
        lastFrameAt = Date.now();
        if (hadDisconnect) {
          // Resync: entre la caída y el reconnect pudimos perder frames
          hadDisconnect = false;
          resyncAll();
        }
      };

      es.onmessage = (message) => {
        lastFrameAt = Date.now();
        if (document.visibilityState === 'hidden') return;
        try {
          const parsed = JSON.parse(message.data as string) as { keys?: RealtimeKey[]; type?: string };
          // Heartbeat observable: solo prueba de vida, sin invalidación
          if (parsed.type === 'ping' || !parsed.keys) return;
          invalidateKeys(parsed.keys);
        } catch {
          // Frame malformado — ignorar
        }
      };

      es.onerror = () => {
        hadDisconnect = true;
        // EventSource reintenta automáticamente; el watchdog cubre el caso
        // en que la conexión muere SIN error (half-open detrás de un proxy)
      };
    };

    connect();

    // Watchdog: si pasan >75s sin frames (~3 heartbeats), la conexión está
    // muerta en silencio → reconexión manual. Con tab oculta se skipea (el
    // browser congela timers/frames; al volver, visibilitychange resynca y
    // el watchdog reconecta en su siguiente tick si la conexión sigue muerta).
    const watchdog = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastFrameAt > HEARTBEAT_DEAD_MS) {
        hadDisconnect = true;
        source?.close();
        connect();
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      stopped = true;
      source?.close();
      clearInterval(safetyPoll);
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router, queryClient]);

  return <>{children}</>;
}
