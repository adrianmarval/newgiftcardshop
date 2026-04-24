// ─────────────────────────────────────────────────────────────────────────────
// Order — Search params y schemas (nuqs v2 + Zod)
// Todos los parsers y schemas de filtrado para órdenes del buyer.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';
import { buyerOrderSchema } from './Order';

// ── nuqs parsers (para URL search params y useQueryStates) ──────────────────

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

// ── Zod input schema (para server action) ────────────────────────────────────

/**
 * Schema de entrada para getBuyerOrders (paginación).
 * Todos los campos son opcionales con defaults sensatos.
 */
export const getBuyerOrdersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export type GetBuyerOrdersInput = z.infer<typeof getBuyerOrdersInputSchema>;

/** Schema de salida para getBuyerOrders (usa paginatedOutputSchema). */
export const getBuyerOrdersOutputSchema = paginatedOutputSchema(z.array(buyerOrderSchema));
