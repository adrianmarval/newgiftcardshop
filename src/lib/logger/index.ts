// ─────────────────────────────────────────────────────────────────────────────
// Logger — Centralized logging with Pino + PostgreSQL persistence
//
// Usage:
//   import { logger } from '@/lib/logger';           // system logger
//   import { createLogger } from '@/lib/logger';      // custom source logger
//
//   logger.info('Server started');
//   logger.action('sell', 'publish-batch', 'Batch published', { userId, metadata });
//   logger.error('Unexpected error', { error: { name, message, stack } });
// ─────────────────────────────────────────────────────────────────────────────

import { createLogger } from './logger';
import type { Logger } from './types';

export { createLogger };
export { gracefulFlush } from './db-transport';
export type { Logger, LogLevel, LogSource, LogFlow, LogOptions, LogError } from './types';

// Singleton system logger — survives hot reload via globalThis
const globalForLogger = globalThis as unknown as { __appLogger?: Logger };

export const logger: Logger = globalForLogger.__appLogger ?? createLogger('system');

// SIEMPRE asignar (no solo en dev): en producción webpack duplica este módulo
// en varios chunks y server.ts corre vía tsx con otro module graph. globalThis
// es lo único compartido — ver el invariante en src/lib/realtime/bus.ts.
globalForLogger.__appLogger = logger;
