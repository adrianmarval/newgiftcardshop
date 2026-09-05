import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth/auth-server';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Receptor de errores client-side (error boundaries + global-error).
 * Persiste en app_log via logger (visibles en /admin/dashboard/logs).
 *
 * La sesión es OPCIONAL: un crash durante el login también se quiere loguear.
 * Dedup en memoria (mismo userId+message → 1/min) para que un loop de
 * crash/retry no inunde la tabla.
 */
const clientErrorSchema = z.object({
  name: z.string().max(200),
  message: z.string().max(2000),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(200).optional(),
  context: z.string().max(200).optional(),
  path: z.string().max(500).optional(),
});

const DEDUP_MS = 60_000;
const recentReports = new Map<string, number>();

const log = createLogger('web');

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const parsed = clientErrorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  const userId = session?.user?.id;

  const now = Date.now();
  const dedupKey = `${userId ?? 'anon'}:${parsed.data.message}`;
  const lastReport = recentReports.get(dedupKey);
  if (lastReport && now - lastReport < DEDUP_MS) {
    return Response.json({ ok: true, deduped: true });
  }
  recentReports.set(dedupKey, now);
  // Purga lazy para que el mapa no crezca sin tope
  if (recentReports.size > 500) {
    for (const [key, timestamp] of recentReports) {
      if (now - timestamp > DEDUP_MS) recentReports.delete(key);
    }
  }

  log.error(`Client error: ${parsed.data.message}`, {
    action: 'client-error',
    userId,
    error: {
      name: parsed.data.name,
      message: parsed.data.message,
      stack: parsed.data.stack,
    },
    metadata: {
      digest: parsed.data.digest,
      context: parsed.data.context,
      path: parsed.data.path,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  });

  return Response.json({ ok: true });
}
