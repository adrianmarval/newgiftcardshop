import { EventEmitter } from 'node:events';

/**
 * Bus de eventos realtime (invalidación dirigida).
 *
 * El socket NUNCA transporta data de dominio — solo señales `{ keys }`.
 * La fuente de verdad sigue siendo el servidor (Prisma + gates vía server
 * actions); el cliente reacciona invalidando el cache de TanStack Query
 * (NUNCA router.refresh — ver realtime-provider.tsx).
 *
 * Singleton en globalThis (mismo patrón que BotRegistry / prisma):
 * - Sobrevive al HMR de Next en dev (sin listeners duplicados).
 * - Asume INSTANCIA ÚNICA (igual que los crons de server.ts). Si algún día
 *   se escala horizontalmente, se swapea la implementación por Redis pub/sub
 *   sin tocar publishers ni el endpoint — esta API es el contrato.
 */

export const REALTIME_KEYS = [
  'notifications',
  'orders',
  'batches',
  'availability',
  'payments',
  'stats',
  'users',
] as const;

export type RealtimeKey = (typeof REALTIME_KEYS)[number];

export interface RealtimeEvent {
  keys: RealtimeKey[];
}

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeSubscription {
  userId: string;
  role: 'SELLER' | 'BUYER' | 'ADMIN';
}

const USER_CHANNEL = (userId: string) => `user:${userId}`;
const ROLE_CHANNEL = (role: RealtimeSubscription['role']) => `role:${role}`;

class RealtimeBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Cada conexión SSE suscribe 2 canales; el límite default (10) se queda
    // cortísimo con usuarios concurrentes. 0 = sin límite (las suscripciones
    // se liberan en el close del stream — ver app/api/realtime/route.ts).
    this.emitter.setMaxListeners(0);
  }

  /** Publica una señal de invalidación a un usuario específico. */
  publishToUser(userId: string, keys: RealtimeKey[]): void {
    this.emitter.emit(USER_CHANNEL(userId), { keys } satisfies RealtimeEvent);
  }

  /** Publica una señal de invalidación a varios usuarios. */
  publishToUsers(userIds: string[], keys: RealtimeKey[]): void {
    for (const userId of userIds) {
      this.publishToUser(userId, keys);
    }
  }

  /** Publica una señal de invalidación a todos los conectados de un rol. */
  publishToRole(role: RealtimeSubscription['role'], keys: RealtimeKey[]): void {
    this.emitter.emit(ROLE_CHANNEL(role), { keys } satisfies RealtimeEvent);
  }

  /**
   * Suscribe a los canales del usuario + su rol. Retorna `unsubscribe`.
   * Usado exclusivamente por el endpoint SSE (una suscripción por conexión).
   */
  subscribe(subscription: RealtimeSubscription, listener: RealtimeListener): () => void {
    const userChannel = USER_CHANNEL(subscription.userId);
    const roleChannel = ROLE_CHANNEL(subscription.role);

    this.emitter.on(userChannel, listener);
    this.emitter.on(roleChannel, listener);

    return () => {
      this.emitter.off(userChannel, listener);
      this.emitter.off(roleChannel, listener);
    };
  }
}

const globalForRealtime = globalThis as unknown as { __realtimeBus?: RealtimeBus };

export const realtimeBus: RealtimeBus = globalForRealtime.__realtimeBus ?? new RealtimeBus();

// SIEMPRE asignar (no solo en dev): en producción webpack DUPLICA este módulo
// en varios chunks (verificado: route.js + 2 chunks con copias propias) y
// server.ts corre vía tsx con otro module graph distinto. globalThis es lo
// único compartido entre todos los graphs del proceso — sin esto, cada copia
// tiene su propio EventEmitter y los eventos nunca llegan al stream SSE.
globalForRealtime.__realtimeBus = realtimeBus;

// Helpers de conveniencia (API pública para los emit points)
export const publishToUser = (userId: string, keys: RealtimeKey[]) => realtimeBus.publishToUser(userId, keys);
export const publishToUsers = (userIds: string[], keys: RealtimeKey[]) => realtimeBus.publishToUsers(userIds, keys);
export const publishToRole = (role: RealtimeSubscription['role'], keys: RealtimeKey[]) =>
  realtimeBus.publishToRole(role, keys);
