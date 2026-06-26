// ── Domain — Entity schemas (cross-feature) ────────────────────────────────────
export * from './domain';

// ── Application — Cross-cutting types ─────────────────────────────────────────
export * from './application';

// ── Auth — Session types (used across the app) ───────────────────────────────
export type { Session, SessionUser, TelegramUserSessionData } from './auth/session';

// ── Binance ────────────────────────────────────────────────────────────────────
export * from './binance';

// ── Sell Flow — Types shared between lib, hooks, and components ───────────────
export * from './sell-flow';

// ── Buy Flow — Types shared between hooks and components ──────────────────────
export * from './buy-flow';

// ── Notifications — Types shared between lib/services and components ──────────
export * from './notifications';

// ── Service interfaces — Shared contracts between services, actions, and bots ─
export * from './services';
