// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Navigation components
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from "react";
import type { Sidebar } from "@/components/ui/sidebar";

/**
 * Icon component type used in navigation items.
 * Accepts optional `size` and `className` props, compatible with Lucide icons.
 */
export type NavItemIcon = React.ComponentType<{ size?: number | string; className?: string }>;

/**
 * A single navigation item rendered in the portal sidebar menu.
 */
export interface NavItem {
  title: string;
  url: string;
  icon: NavItemIcon;
}

/**
 * Props for the PortalSidebar component.
 * Extends Sidebar's own props with portal-specific configuration.
 */
export interface PortalSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
  brandLabel: string;
  brandHref: string;
  groupLabel?: string;
  portal: string;
  logoutVariant?: "destructive" | "ghost" | "default" | "outline" | "secondary" | "link";
}
