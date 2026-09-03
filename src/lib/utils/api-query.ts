/**
 * apiQuery — transporte de LECTURA para el layer de React Query.
 *
 * INVARIANTE ARQUITECTÓNICO: las queries client-side NO usan server actions.
 * Una server action invocada imperativamente se procesa en la cola de
 * transiciones del router; si su reply aterriza con una navegación en vuelo,
 * el App Router DESCARTA la navegación y la URL revierte (verificado
 * empíricamente: action POST en vuelo + click = ~60% de navs abortadas;
 * fetch GET plano en las mismas condiciones = 0%). Un GET a route handler no
 * toca el router — la race desaparece por construcción. Bonus: la URL es
 * estable entre deploys (adiós "Failed to find Server Action" en tabs viejas).
 *
 * El endpoint /api/query/[name] ejecuta la action server-side (sus guards de
 * rol siguen siendo la fuente de autorización) — esto solo cambia el transporte.
 */

import { deserializeDates, serializeDates } from './json-payload';

export async function apiQuery<T>(name: string, input?: unknown): Promise<T> {
  const qs = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify(serializeDates(input)))}` : '';
  const res = await fetch(`/api/query/${name}${qs}`, { cache: 'no-store' });

  let body: unknown = null;
  try {
    body = deserializeDates(await res.json());
  } catch {
    // respuesta no-JSON (ej. HTML de error de infraestructura)
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  const envelope = body as {
    data?: T;
    serverError?: string;
    validationErrors?: unknown;
  } | null;

  if (envelope?.serverError) throw new Error(envelope.serverError);
  if (envelope?.validationErrors) throw new Error('Error de validación.');
  if (!envelope || !('data' in envelope)) throw new Error('Respuesta inválida del servidor.');
  return envelope.data as T;
}
