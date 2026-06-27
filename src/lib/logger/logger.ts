// ─────────────────────────────────────────────────────────────────────────────
// Logger Factory — Creates pino-based loggers with DB transport
// ─────────────────────────────────────────────────────────────────────────────

import pino from 'pino';
import { createDbTransport } from './db-transport';
import type { Logger, LogSource, LogFlow, LogOptions } from './types';

let _pinoInstance: pino.Logger | null = null;

function getPino(): pino.Logger {
  if (!_pinoInstance) {
    _pinoInstance = pino({ level: 'debug' }, createDbTransport());
  }
  return _pinoInstance;
}

export function createLogger(source: LogSource): Logger {
  const pinoLogger = getPino().child({ source });

  return {
    info(message: string, opts?: LogOptions) {
      pinoLogger.info({ ...opts }, message);
    },

    warn(message: string, opts?: LogOptions) {
      pinoLogger.warn({ ...opts }, message);
    },

    error(message: string, opts?: LogOptions) {
      pinoLogger.error({ ...opts }, message);
    },

    debug(message: string, opts?: LogOptions) {
      pinoLogger.debug({ ...opts }, message);
    },

    action(flow: LogFlow, action: string, message: string, opts?: Omit<LogOptions, 'flow' | 'action'>) {
      pinoLogger.info({ flow, action, ...opts }, message);
    },
  };
}
