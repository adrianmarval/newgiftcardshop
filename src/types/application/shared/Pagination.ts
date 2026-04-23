// ─────────────────────────────────────────────────────────────────────────────
// Application — Shared types across multiple flows
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Pagination ────────────────────────────────────────────────────────────────

/**
 * Metadata for pagination state.
 * Use this to display pagination controls (page X of Y, total items).
 *
 * @example
 * // In a component that receives pagination state:
 * function OrdersList({ orders, pagination }: OrdersListProps) {
 *   const { currentPage, totalPages, totalCount } = pagination;
 *   return (
 *     <div>
 *       <p>Mostrando {totalCount} órdenes</p>
 *       <UrlPagination totalPages={totalPages} />
 *     </div>
 *   );
 * }
 */
export interface PaginationMeta {
  /** The current page number (1-indexed). */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of items across all pages. */
  totalCount: number;
}

/**
 * Generic paginated response wrapper.
 * Use this as the return type for any server action that returns a paginated list.
 *
 * @typeParam T - The entity type being paginated (e.g., BuyerOrder, SellerBatch)
 *
 * @example
 * // Server action return type:
 * async function getOrders(): Promise<PaginatedResponse<BuyerOrder>> {
 *   return { items: orders, pagination: { currentPage, totalPages, totalCount } };
 * }
 *
 * @example
 * // Using in a page component:
 * const { items, pagination } = result.data;
 * return <BuyerOrdersView orders={items} pagination={pagination} />;
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page. */
  items: T[];
  /** Pagination metadata for UI controls. */
  pagination: PaginationMeta;
}

/**
 * Input parameters for paginated queries.
 * Use as the input type for server actions that support pagination.
 *
 * @example
 * // In a server action:
 * inputSchema(getPaginatedInputSchema)
 * .action(async ({ parsedInput }) => {
 *   const { page, limit } = parsedInput;
 *   const skip = (page - 1) * limit;
 *   return prisma.order.findMany({ skip, take: limit });
 * });
 */
export interface PaginationParams {
  /** Page number (1-indexed). Defaults to 1 if not provided. */
  page: number;
  /** Number of items per page. Defaults to 10 if not provided. */
  limit: number;
}

/**
 * Factory function to create Zod output schemas for paginated server actions.
 * Ensures all paginated responses follow the same structure: { success, items, pagination }.
 *
 * @typeParam T - The Zod schema type for the item being paginated (e.g., z.array(orderSchema))
 * @param itemsSchema - The Zod schema for the array of items
 * @returns A Zod object schema with { success: true, items: T[], pagination: { ... } }
 *
 * @example
 * // In a schema file:
 * export const getOrdersOutputSchema = paginatedOutputSchema(z.array(orderSchema));
 *
 * // Resulting shape:
 * {
 *   success: true,
 *   items: Order[],
 *   pagination: { currentPage: number, totalPages: number, totalCount: number }
 * }
 */
export function paginatedOutputSchema<T>(itemsSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    items: itemsSchema,
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
    }),
  });
}
