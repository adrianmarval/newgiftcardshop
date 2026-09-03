'use client';

import { startTransition, useEffect, useRef } from 'react';
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
 * INVARIANTE — TODO router.refresh() de fondo va dentro de startTransition:
 * un refresh que cae mientras hay una navegación del usuario en vuelo (Link
 * click, paginación nuqs con shallow:false) la ABORTA y la URL revierte al
 * último estado commiteado (bug conocido del App Router). Marcado como
 * transition de baja prioridad, la navegación del usuario lo preempta.
 * NUNCA llamar router.refresh() directo en este archivo.
 *
 * Safety nets:
 * - Reconexión: EventSource reintenta solo; en `onopen` tras una caída se
 *   hace un refresh incondicional (resync de frames perdidos).
 * - Watchdog anti half-open: proxies/tunnels (cloudflared) pueden dejar de
 *   entregar frames SIN cerrar el TCP — `onerror` nunca dispara y la
 *   reconexión automática nunca arranca. El heartbeat del servidor es un
 *   frame de data OBSERVABLE (`{"type":"ping"}` cada 25s); si pasan >75s
 *   sin frames la conexión se declara muerta y se reconecta manualmente.
 * - Poll lento SIEMPRE activo (5min, solo con tab visible): convergencia
 *   eventual ante un emit point que se haya escapado.
 * - Refreshes pausados con el tab oculto (el refresh corre al volver).
 *
 * La conexión SSE es ESTABLE por la vida del provider: NO se recrea al
 * navegar entre páginas (un cierre/reapertura por soft-nav genera churn de
 * suscripciones al bus y ruido ERR "stream canceled" en proxies/tunnels).
 * Las keys de la ruta actual viven en un ref que onmessage lee en vivo.
 */

/** Mapa ruta → keys que esa ruta consume. Match por prefijo, gana el primero. */
const ROUTE_KEYS: Array<[prefix: string, keys: RealtimeKey[]]> = [
  ['/sell/dashboard/sell-cards', ['batches', 'stats', 'notifications']],
  ['/sell/dashboard/cards', ['batches', 'stats', 'notifications']],
  ['/sell/dashboard', ['batches', 'stats', 'notifications']],
  ['/store/dashboard/browse-cards', ['availability', 'orders', 'notifications']],
  ['/store/dashboard/orders', ['orders', 'notifications']],
  ['/store/dashboard', ['availability', 'orders', 'stats', 'notifications']],
  // Admin: keys granulares por subruta. Antes TODO el portal consumía todas
  // las keys — cualquier evento del marketplace disparaba un refresh (con
  // throttle de 1s), maximizando la colisión con navegaciones en vuelo.
  ['/admin/dashboard/orders', ['orders', 'notifications']],
  ['/admin/dashboard/batches', ['batches', 'notifications']],
  ['/admin/dashboard/payments', ['payments', 'notifications']],
  ['/admin/dashboard/users', ['users', 'notifications']],
  ['/admin/dashboard/brands', ['catalog', 'notifications']],
  ['/admin/dashboard/coins', ['catalog', 'notifications']],
  ['/admin/dashboard/config', ['settings', 'notifications']],
  ['/admin/dashboard/issues', ['orders', 'notifications']],
  ['/admin/dashboard/logs', ['notifications']],
  ['/admin/dashboard', ['stats', 'orders', 'batches', 'payments', 'notifications']],
];

const DEFAULT_KEYS: RealtimeKey[] = ['notifications'];

/** Poll de safety net (no el mecanismo principal — eso es el SSE). */
const SAFETY_POLL_MS = 5 * 60 * 1000;
/** Throttle de refreshes para ráfagas de eventos. */
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
    let stopped = false;
    let source: EventSource | null = null;
    // Último frame recibido (data o ping) — el watchdog lo usa para detectar
    // conexiones half-open (frames dejan de llegar sin que onerror dispare)
    let lastFrameAt = Date.now();

    const throttledRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      // En transition: update de fondo, la navegación del usuario preempta
      startTransition(() => router.refresh());
    };

    // Al volver al tab: resync por si hubo eventos mientras estaba oculto
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastRefreshAt.current = 0;
        startTransition(() => router.refresh());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Safety net: convergencia eventual ante emit points perdidos
    const safetyPoll = setInterval(throttledRefresh, SAFETY_POLL_MS);

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
          lastRefreshAt.current = 0;
          startTransition(() => router.refresh());
        }
      };

      es.onmessage = (message) => {
        lastFrameAt = Date.now();
        try {
          const parsed = JSON.parse(message.data as string) as { keys?: RealtimeKey[]; type?: string };
          // Heartbeat observable: solo prueba de vida, sin invalidación
          if (parsed.type === 'ping' || !parsed.keys) return;
          if (parsed.keys.some((key) => routeKeysRef.current.includes(key))) {
            throttledRefresh();
          }
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
  }, [router]);

  return <>{children}</>;
}
