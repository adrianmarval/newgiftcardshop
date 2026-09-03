import type { RealtimeKey } from './bus';

/**
 * Mapa RealtimeKey → query keys de TanStack Query que el evento invalida.
 *
 * El SSE ya NO hace router.refresh() para las vistas migradas: invalida el
 * cache client-side y React Query re-fetchea EN EL LUGAR (sin tocar el
 * router, sin re-render de página completa, sin races con la navegación).
 * Prefix match: invalidar ['admin-orders'] cubre todas las variantes de
 * params (['admin-orders', { page: 2, ... }]).
 *
 * Keys sin entrada acá (stats/catalog/settings) caen al fallback
 * router.refresh() scoped por ruta en el RealtimeProvider — son las que
 * alimentan las home dashboards (no migradas, sin paginación).
 */
export const REALTIME_QUERY_KEYS: Partial<Record<RealtimeKey, readonly string[]>> = {
  orders: ['admin-orders', 'buyer-orders'],
  batches: ['admin-batches', 'seller-batches'],
  payments: ['admin-payments'],
  users: ['admin-users'],
  notifications: ['unread-counts'],
  availability: ['live-availability'],
};

/**
 * Keys sin query asociada: el provider cae a router.refresh() (scoped por
 * ruta via ROUTE_KEYS, dentro de startTransition).
 */
export const FALLBACK_REFRESH_KEYS: readonly RealtimeKey[] = ['stats', 'catalog', 'settings'];
