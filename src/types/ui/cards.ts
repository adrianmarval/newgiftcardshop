// ─────────────────────────────────────────────────────────────────────────────
// UI — Card status
// Interfaz mínima para el componente CardStatusBadge.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forma mínima requerida por CardStatusBadge.
 * Cualquier Giftcard satisface esta interfaz.
 *
 * @example
 * // En un componente que recibe un card:
 * function CardStatusBadge({ card }: { card: CardStatusInput }) {
 *   const color = card.isConfirmed ? 'success' : card.status === 'INVALID' ? 'danger' : 'warning';
 *   return <Badge variant={color}>{card.status}</Badge>;
 * }
 */
export interface CardStatusInput {
  /** Si el card fue confirmado por el buyer. */
  isConfirmed: boolean;
  /** Status del card como string. */
  status: string;
  /** ID de la orden asociada (null si no está en una orden). */
  orderId: string | null;
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}
