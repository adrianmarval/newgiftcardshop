// ─────────────────────────────────────────────────────────────────────────────
// UI — Navigation
// Tipos para componentes de navegación (sidebar, menú).
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from 'react';

/**
 * Tipo para el componente de icon en items de navegación.
 * Acepta props opcionales `size` y `className`, compatible con Lucide icons.
 */
export type NavItemIcon = React.ComponentType<{
  size?: number | string;
  className?: string;
}>;

/**
 * Item individual de navegación renderizado en el sidebar del portal.
 */
export interface NavItem {
  /** Texto del item (ej: "Mis Órdenes", "My Cards"). */
  title: string;
  /** URL de destino del link. */
  url: string;
  /** Componente Icon a mostrar. */
  icon: NavItemIcon;
}
