// ─────────────────────────────────────────────────────────────────────────────
// UI — Stats display
// Tipos para componentes de feedback/estadísticas.
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from 'react';

/**
 * Item individual para el componente de grilla de estadísticas.
 * Usado en OrdersStats, BatchesStats, etc.
 *
 * @example
 * const stats: StatsItem[] = [
 *   { label: 'Total Orders', value: 42, description: 'All time', icon: <ShoppingCart /> },
 *   { label: 'Pending', value: 3, description: 'Awaiting payment', icon: <Clock />, color: 'warning' },
 * ];
 */
export interface StatsItem {
  /** Label descriptivo (ej: "Total Orders"). */
  label: string;
  /** Valor a mostrar (string para formateo custom, number para display directo). */
  value: string | number;
  /** Descripción secundaria (ej: "All time", "Last 30 days"). */
  description: string;
  /** Componente Icon (Lucide o similar). */
  icon: React.ReactNode;
  /** Color CSS opcional para el item (ej: 'warning', 'success', 'danger'). */
  color?: string;
}
