// ─────────────────────────────────────────────────────────────────────────────
// Sell Batches Component Props
// ─────────────────────────────────────────────────────────────────────────────

import type { SellerBatch } from '@/types/domain/seller';
import type { Giftcard } from '@/types/domain/giftcard';
import type { PaginationMeta } from '@/types/application/shared';

/**
 * Props for the BatchesStats component.
 * Displays aggregated batch statistics.
 */
export interface BatchesStatsProps {
  batches: SellerBatch[];
}

/**
 * Props for the BatchesFilters component.
 * Search and filter controls for batches.
 */
export interface BatchesFiltersProps {
  onSearchChange?: (search: string) => void;
}

/**
 * Props for the BatchCard component.
 * Single batch card with expandable details.
 */
export interface BatchCardProps {
  batch: SellerBatch;
  isExpanded: boolean;
  onToggle: () => void;
  onCardClick: (card: Giftcard) => void;
}

/**
 * Props for the BatchDetails component.
 * Shows detailed view of a single batch's giftcards.
 */
export interface BatchDetailsProps {
  batch: SellerBatch;
  onCardClick: (card: Giftcard) => void;
}

/**
 * Props for the BatchesList component.
 * Displays a list of seller batches.
 */
export interface BatchesListProps {
  batches: SellerBatch[];
  totalPages?: number;
  onCardClick: (card: Giftcard) => void;
}

/**
 * Props for the SellerBatchesView component.
 * Main view component displaying all seller batches with stats and filtering.
 */
export interface SellerBatchesViewProps {
  batches: SellerBatch[];
  pagination?: PaginationMeta;
}
