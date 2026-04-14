// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Navigation data shapes
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from 'react';

/**
 * Icon component type used in navigation items.
 * Accepts optional `size` and `className` props, compatible with Lucide icons.
 */
export type NavItemIcon = React.ComponentType<{
  size?: number | string;
  className?: string;
}>;

/**
 * A single navigation item rendered in the portal sidebar menu.
 */
export interface NavItem {
  title: string;
  url: string;
  icon: NavItemIcon;
}
