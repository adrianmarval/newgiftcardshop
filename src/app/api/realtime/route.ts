import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth-server';
import { realtimeBus, type RealtimeKey } from '@/lib/realtime/bus';
import type { Session } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Intervalo de heartbeat — proxies/NGINX cierran conexiones idle a los ~30-60s.
 * OJO: el heartbeat es un frame de DATA (`{"type":"ping"}`), NO un comentario
 * SSE (`: ping`). Por spec, las líneas `:` nunca se entregan a `onmessage`, así
 * que un heartbeat-comentario es INOBSERVABLE para el cliente — el watchdog del
 * RealtimeProvider (anti half-open detrás de tunnels/proxies) necesita verlo.
 */
const HEARTBEAT_MS = 25_000;
/**
 * Ventana de coalescing: ráfagas de eventos (ej. publicar un batch con N
 * notificaciones asociadas) se colapsan en UN frame con la unión de keys,
 * para que el cliente haga un solo router.refresh().
 */
const COALESCE_MS = 300;

/**
 * SSE endpoint de invalidación realtime.
 *
 * El stream NUNCA transporta data de dominio — solo `{ keys: RealtimeKey[] }`.
 * Autenticación: cookie de sesión better-auth (mismo origen, viaja sola).
 * Filtrado server-side: cada conexión solo recibe eventos dirigidos a su
 * userId o a su rol. Sin sesión → 401 (EventSource reintenta; el fallback
 * a poll del RealtimeProvider cubre el limbo).
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const role = (session.user as Session['user']).role as 'SELLER' | 'BUYER' | 'ADMIN';

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const pendingKeys = new Set<RealtimeKey>();
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const flush = () => {
        flushTimer = null;
        if (pendingKeys.size === 0) return;
        const keys = [...pendingKeys];
        pendingKeys.clear();
        safeEnqueue(`data: ${JSON.stringify({ keys })}\n\n`);
      };

      const unsubscribe = realtimeBus.subscribe({ userId, role }, (event) => {
        for (const key of event.keys) pendingKeys.add(key);
        flushTimer ??= setTimeout(flush, COALESCE_MS);
      });

      const heartbeat = setInterval(() => safeEnqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`), HEARTBEAT_MS);

      // Frame inicial: confirma al cliente que el stream está vivo
      safeEnqueue(': connected\n\n');

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        if (flushTimer) clearTimeout(flushTimer);
        try {
          controller.close();
        } catch {
          // ya cerrado por el runtime
        }
      };

      request.signal.addEventListener('abort', cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Evita que proxies con buffering (NGINX) retengan los frames
      'X-Accel-Buffering': 'no',
    },
  });
}
