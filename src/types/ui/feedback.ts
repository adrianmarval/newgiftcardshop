// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Stats data shape
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from 'react';

/**
 * A single stats item for the stats grid component.
 */
export interface StatsItem {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color?: string;
}
