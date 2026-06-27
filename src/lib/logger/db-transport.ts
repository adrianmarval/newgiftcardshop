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

const buffer: Array<{
  level: string;
  source: LogSource;
  flow: LogFlow | null;
  action: string | null;
  message: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  error: { name: string; message: string; stack?: string } | null;
  ip: string | null;
}> = [];

let flushTimer: ReturnType<typeof setInterval> | null = null;
let isShuttingDown = false;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  flushTimer.unref();
}

async function flushBuffer() {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);

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
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  await flushBuffer();
}

// Register shutdown hooks once
let hooksRegistered = false;
function registerShutdownHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

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

        buffer.push({
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

        if (buffer.length >= BUFFER_LIMIT) {
          void flushBuffer();
        }

        callback();
      } catch {
        callback();
      }
    },
  });
}
