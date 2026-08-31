// ─────────────────────────────────────────────────────────────────────────────
// DB Transport — Buffered Pino transport that writes logs to PostgreSQL
// Flushes every 5s or when buffer reaches 50 entries.
// ─────────────────────────────────────────────────────────────────────────────

import { Writable } from 'node:stream';
import prisma from '@/lib/prisma';
import type { LogSource, LogFlow } from './types';

interface PinoLogEntry {
  level: number;
  time?: number;
  msg?: string;
  source?: LogSource;
  flow?: LogFlow;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
  ip?: string;
  [key: string]: unknown;
}

const LEVEL_MAP: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const FLUSH_INTERVAL_MS = 5_000;
const BUFFER_LIMIT = 50;

interface LogBufferEntry {
  level: string;
  source: LogSource;
  flow: LogFlow | null;
  action: string | null;
  message: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  error: { name: string; message: string; stack?: string } | null;
  ip: string | null;
}

interface DbTransportState {
  buffer: LogBufferEntry[];
  flushTimer: ReturnType<typeof setInterval> | null;
  isShuttingDown: boolean;
  hooksRegistered: boolean;
}

// Estado en globalThis SIEMPRE (no solo en dev): en producción webpack duplica
// este módulo en varios chunks y server.ts corre vía tsx con otro module graph.
// Sin estado compartido, cada copia tiene su propio buffer+timer y el
// gracefulFlush de server.ts solo flushea la copia del graph de tsx — los logs
// buffereados en los chunks de Next se PIERDEN al apagar el proceso.
const globalForTransport = globalThis as unknown as { __dbTransportState?: DbTransportState };

const state: DbTransportState = globalForTransport.__dbTransportState ?? {
  buffer: [],
  flushTimer: null,
  isShuttingDown: false,
  hooksRegistered: false,
};

globalForTransport.__dbTransportState = state;

function startFlushTimer() {
  if (state.flushTimer) return;
  state.flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  state.flushTimer.unref();
}

async function flushBuffer() {
  if (state.buffer.length === 0) return;

  const batch = state.buffer.splice(0, state.buffer.length);

  try {
    await prisma.appLog.createMany({
      data: batch.map((entry) => ({
        level: entry.level,
        source: entry.source,
        flow: entry.flow,
        action: entry.action,
        message: entry.message,
        userId: entry.userId,
        metadata: entry.metadata as never,
        error: entry.error as never,
        ip: entry.ip,
      })),
    });
  } catch {
    // If DB write fails, logs are lost — acceptable for non-critical logging
    // Re-adding would cause infinite loops on persistent DB issues
  }
}

export async function gracefulFlush() {
  if (state.isShuttingDown) return;
  state.isShuttingDown = true;

  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }

  await flushBuffer();
}

// Register shutdown hooks once (compartido entre todos los chunks via state)
function registerShutdownHooks() {
  if (state.hooksRegistered) return;
  state.hooksRegistered = true;

  process.once('beforeExit', () => {
    void gracefulFlush();
  });
  process.once('SIGINT', () => {
    void gracefulFlush();
  });
  process.once('SIGTERM', () => {
    void gracefulFlush();
  });
}

export function createDbTransport(): Writable {
  registerShutdownHooks();
  startFlushTimer();

  return new Writable({
    decodeStrings: false,
    write(chunk: string, _encoding, callback) {
      try {
        const entry: PinoLogEntry = JSON.parse(chunk);

        // Skip pino's internal messages
        if (!entry.source) {
          callback();
          return;
        }

        state.buffer.push({
          level: LEVEL_MAP[entry.level] ?? 'info',
          source: entry.source,
          flow: entry.flow ?? null,
          action: entry.action ?? null,
          message: entry.msg ?? '',
          userId: entry.userId ?? null,
          metadata: entry.metadata ?? null,
          error: entry.error ?? null,
          ip: entry.ip ?? null,
        });

        if (state.buffer.length >= BUFFER_LIMIT) {
          void flushBuffer();
        }

        callback();
      } catch {
        callback();
      }
    },
  });
}
