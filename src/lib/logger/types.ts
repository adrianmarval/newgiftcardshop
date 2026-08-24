// ─────────────────────────────────────────────────────────────────────────────
// Logger Types — Centralized type definitions for the logging system
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogSource = 'web' | 'seller-bot' | 'buyer-bot' | 'cron' | 'system';

export type LogFlow = 'sell' | 'buy' | 'order' | 'payment' | 'batch' | 'auth' | 'admin';

export interface LogError {
  name: string;
  message: string;
  stack?: string;
}

export interface LogOptions {
  flow?: LogFlow;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: LogError;
  ip?: string;
}

export interface Logger {
  info(message: string, opts?: LogOptions): void;
  warn(message: string, opts?: LogOptions): void;
  error(message: string, opts?: LogOptions): void;
  debug(message: string, opts?: LogOptions): void;
  action(flow: LogFlow, action: string, message: string, opts?: Omit<LogOptions, 'flow' | 'action'>): void;
}
