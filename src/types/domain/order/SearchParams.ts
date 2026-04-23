// ─────────────────────────────────────────────────────────────────────────────
// Order — Search Params para órdenes del buyer
// Parsers de URL search params usando nuqs v2.
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

// ── Parser Definitions ────────────────────────────────────────────────────────

/**
 * Parsers para los search params de la página de órdenes del buyer.
 * Usa nuqs/server para parsing tipo-seguro en Server Components.
 *
 * Ejemplo de URL: /buy/dashboard/orders?page=2&status=PENDING&search=order_123&sort=oldest
 */
export const orderSearchParamsParsers = {
  /** Número de página (1-indexed). Default: 1 */
  page: parseAsInteger.withDefault(1),
  /** Filtrar por estado. 'ALL' muestra todos los estados. */
  status: parseAsStringLiteral(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const).withDefault('ALL'),
  /** Búsqueda por ID de orden. Default: '' (sin filtro). */
  search: parseAsString.withDefault(''),
  /** Ordenamiento: más nuevas primero o más viejas primero. Default: 'newest'. */
  sort: parseAsStringLiteral(['newest', 'oldest'] as const).withDefault('newest'),
} as const;

// ── Derived Types ─────────────────────────────────────────────────────────────

/**
 * Tipo derivado de los parsers para uso en componentes.
 * Representa el estado completo de filtros/búsqueda en la URL.
 */
export type OrderSearchParams = {
  page: number;
  status: 'ALL' | 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
  search: string;
  sort: 'newest' | 'oldest';
};

/** Union de keys válidas para OrderSearchParams. Útil para iterate over params. */
export type OrderSearchParamsKeys = keyof typeof orderSearchParamsParsers;
