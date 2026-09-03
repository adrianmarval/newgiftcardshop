import type { RealtimeKey } from './bus';

/**
 * Mapa RealtimeKey → query keys de TanStack Query que el evento invalida.
 *
 * El SSE NUNCA hace router.refresh(): invalida el cache client-side y React
 * Query re-fetchea EN EL LUGAR (sin tocar el router, sin re-render de página
 * completa, sin races con la navegación). Prefix match: invalidar
 * ['admin-orders'] cubre todas las variantes de params
 * (['admin-orders', { page: 2, ... }]).
 *
 * TODA vista que necesita frescura realtime debe fetchear via React Query
 * (useListQuery o useQuery con initialData del server page) y registrar su
 * query key acá. Si una vista nueva no aparece en este mapa, NO recibe
 * actualizaciones realtime — no existe fallback.
 */
export const REALTIME_QUERY_KEYS: Partial<Record<RealtimeKey, readonly string[]>> = {
  orders: ['admin-orders', 'buyer-orders', 'buyer-recent-orders', 'admin-profit-stats'],
  batches: ['admin-batches', 'seller-batches', 'seller-recent-batches', 'admin-inventory-stats', 'admin-stock-aging'],
  payments: ['admin-payments', 'platform-balance', 'admin-binance-balance', 'admin-profit-stats'],
  users: ['admin-users'],
  notifications: ['unread-counts', 'notifications-page'],
  availability: ['live-availability'],
  stats: ['seller-dashboard-stats', 'buyer-dashboard-stats'],
};
