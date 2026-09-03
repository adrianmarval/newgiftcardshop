'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeKey } from '@/lib/realtime/bus';
import { REALTIME_QUERY_KEYS } from '@/lib/realtime/query-keys';

/**
 * RealtimeProvider — invalidación dirigida por SSE.
 *
 * Escucha /api/realtime (SSE) y, ante una señal de invalidación, invalida el
 * cache de TanStack Query: React Query re-fetchea EN EL LUGAR. El router NO
 * participa NUNCA — cero races con la navegación del usuario, cero re-render
 * de página completa, cero pérdida de scroll/foco/estado local.
 *
 * INVARIANTE — este provider JAMÁS llama router.refresh(): un refresh que
 * cae mientras hay una navegación del usuario en vuelo la ABORTA y la URL
 * revierte al último estado commiteado (bug del App Router, verificado —
 * ni startTransition lo elimina). TODA vista que necesite frescura realtime
 * fetchea via React Query (useListQuery o useQuery con initialData del
 * server page) y registra su query key en REALTIME_QUERY_KEYS.
 *
 * Safety nets:
 * - Reconexión: EventSource reintenta solo; en `onopen` tras una caída se
 *   hace un resync completo (invalidar todo).
 * - Watchdog anti half-open: proxies/tunnels (cloudflared) pueden dejar de
 *   entregar frames SIN cerrar el TCP — `onerror` nunca dispara y la
 *   reconexión automática nunca arranca. El heartbeat del servidor es un
 *   frame de data OBSERVABLE (`{"type":"ping"}` cada 25s); si pasan >75s
 *   sin frames la conexión se declara muerta y se reconecta manualmente.
 * - Resync lento SIEMPRE activo (5min, solo con tab visible): convergencia
 *   eventual ante un emit point que se haya escapado.
 * - Refetches pausados con el tab oculto (el resync corre al volver).
 *
 * La conexión SSE es ESTABLE por la vida del provider: NO se recrea al
 * navegar entre páginas (un cierre/reapertura por soft-nav genera churn de
 * suscripciones al bus y ruido ERR "stream canceled" en proxies/tunnels).
 */

/** Resync de safety net (no el mecanismo principal — eso es el SSE). */
const SAFETY_POLL_MS = 5 * 60 * 1000;
/**
 * Watchdog anti half-open: tolera ~3 heartbeats perdidos (25s c/u) antes de
 * declarar la conexión muerta en silencio y reconectar manualmente.
 */
const HEARTBEAT_DEAD_MS = 75_000;
const WATCHDOG_INTERVAL_MS = 15_000;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // Dedup de invalidaciones concurrentes por query key (ráfagas de eventos)
  const pendingRef = useRef<Set<string>>(new Set());

  // Mount-only: UNA conexión SSE por la vida del provider (ver docblock)
  useEffect(() => {
    let hadDisconnect = false;
    let stopped = false;
    let source: EventSource | null = null;
    // Último frame recibido (data o ping) — el watchdog lo usa para detectar
    // conexiones half-open (frames dejan de llegar sin que onerror dispare)
    let lastFrameAt = Date.now();

    const invalidate = (queryKey: string) => {
      if (pendingRef.current.has(queryKey)) return;
      pendingRef.current.add(queryKey);
      void queryClient.invalidateQueries({ queryKey: [queryKey] }).finally(() => {
        pendingRef.current.delete(queryKey);
      });
    };

    const invalidateKeys = (keys: RealtimeKey[]) => {
      for (const key of keys) {
        const queryKeys = REALTIME_QUERY_KEYS[key];
        if (!queryKeys) continue;
        for (const queryKey of queryKeys) {
          invalidate(queryKey);
        }
      }
    };

    // Resync completo: invalida TODO (frames perdidos, vuelta de tab oculto,
    // convergencia del safety poll)
    const resyncAll = () => {
      if (document.visibilityState === 'hidden') return;
      for (const queryKeys of Object.values(REALTIME_QUERY_KEYS)) {
        for (const queryKey of queryKeys) {
          invalidate(queryKey);
        }
      }
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
  }, [queryClient]);

  return <>{children}</>;
}
