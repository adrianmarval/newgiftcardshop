// ─────────────────────────────────────────────────────────────────────────────
// Buy Orders Component Props — Moved from @/types barrel
// ─────────────────────────────────────────────────────────────────────────────

import type { BuyerOrder, OrderStatus } from '@/types/domain/order';
import type { Giftcard } from '@/types/domain/giftcard';
import type { PaginationMeta } from '@/types/application/shared';

/**
 * Props for the OrdersStats component.
 * Displays aggregated order statistics.
 */
export interface OrdersStatsProps {
  orders: BuyerOrder[];
  totalCount: number;
}

/**
 * Props for the OrdersList component.
 * Displays a paginated list of buyer orders.
 */
export interface OrdersListProps {
  orders: BuyerOrder[];
  totalPages: number;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
}

/**
 * Props for the OrderDetails component.
 * Shows detailed view of a single order's cards.
 */
export interface OrderDetailsProps {
  order: BuyerOrder;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
}

/**
 * Props for the CardDetailDialog component.
 * Modal showing full gift card details.
 */
export interface CardDetailDialogProps {
  card: Giftcard | null;
  orderStatus: OrderStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Props for the OrdersFilters component.
 * Search and filter controls for orders.
 */
export interface OrdersFiltersProps {
  onSearchChange?: (search: string) => void;
}

/**
 * Props for the OrderCard component.
 * Single order card with expandable details.
 */
export interface OrderCardProps {
  order: BuyerOrder;
  onCardClick?: (card: Giftcard, orderStatus: OrderStatus) => void;
}

/**
 * Props for the BuyerOrdersView component.
 * Main view component displaying all buyer orders with stats and filtering.
 */
export interface BuyerOrdersViewProps {
  orders: BuyerOrder[];
  pagination: PaginationMeta;
}
