// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Card status structural interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal shape required by CardStatusBadge.
 * Any Giftcard satisfies this.
 */
export interface CardStatusInput {
  isConfirmed: boolean;
  status: string;
  orderId: string | null;
}
