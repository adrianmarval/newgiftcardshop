import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (antes de importar la route) ───────────────────────────────────────
const mockGetSession = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@/lib/auth/auth-server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

import { GET } from './route';
import { publishToRole, publishToUser } from '@/lib/realtime/bus';

const SESSION = { user: { id: 'u1', role: 'BUYER' } };

function authedRequest(): Request {
  const controller = new AbortController();
  return new Request('http://localhost/api/realtime', { signal: controller.signal });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Colector de frames: arranca un reader en background y acumula en un buffer.
 * Un SOLO reader por stream (el ReadableStream se lockea al primer getReader).
 */
function startCollector(stream: ReadableStream<Uint8Array>): { getOutput: () => string; stop: () => Promise<void> } {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  let stopped = false;

  void (async () => {
    while (!stopped) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      if (value) out += decoder.decode(value, { stream: true });
    }
  })();

  return {
    getOutput: () => out,
    stop: async () => {
      stopped = true;
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    },
  };
}

describe('GET /api/realtime', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('retorna 401 sin sesión', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
  });

  it('retorna 401 si la sesión no tiene user', async () => {
    mockGetSession.mockResolvedValue({ user: null });
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
  });

  it('con sesión abre stream SSE con headers correctos y frame inicial', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(authedRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');

    const collector = startCollector(res.body!);
    await sleep(100);
    expect(collector.getOutput()).toContain(': connected');
    await collector.stop();
  });

  it('entrega eventos dirigidos al userId de la sesión', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(authedRequest());
    const collector = startCollector(res.body!);

    await sleep(100); // suscripción activa
    publishToUser('u1', ['orders', 'stats']);
    await sleep(600);

    expect(collector.getOutput()).toContain('"keys":["orders","stats"]');
    await collector.stop();
  });

  it('entrega eventos del rol y NO los de otros usuarios ni otros roles', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(authedRequest());
    const collector = startCollector(res.body!);

    await sleep(100);
    publishToUser('otro-user', ['orders']);
    publishToRole('SELLER', ['batches']);
    publishToRole('BUYER', ['availability']);
    await sleep(600);

    const out = collector.getOutput();
    expect(out).toContain('"availability"');
    expect(out).not.toContain('"orders"');
    expect(out).not.toContain('"batches"');
    await collector.stop();
  });

  it('coalesce: ráfaga de eventos se colapsa en UN frame con la unión de keys', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(authedRequest());
    const collector = startCollector(res.body!);

    await sleep(100);
    publishToUser('u1', ['orders']);
    publishToUser('u1', ['stats']);
    publishToRole('BUYER', ['availability']);
    await sleep(600);

    const out = collector.getOutput();
    const dataFrames = out.match(/^data: /gm) ?? [];
    expect(dataFrames.length).toBe(1);
    expect(out).toContain('orders');
    expect(out).toContain('stats');
    expect(out).toContain('availability');
    await collector.stop();
  });
});
