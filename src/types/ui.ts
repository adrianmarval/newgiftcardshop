// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Layout and generic UI component prop types
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from "react";
import type { Sidebar } from "@/components/ui/sidebar";

// ── Stats Grid ────────────────────────────────────────────────────────────────

export interface StatsItem {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color?: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

// ── Empty State ───────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// ── Code Display ──────────────────────────────────────────────────────────────

export interface CodeDisplayProps {
  code: string;
}

// ── Card Status Badge ─────────────────────────────────────────────────────────

/**
 * Minimal shape required by CardStatusBadge.
 * Both Giftcard (seller) and BuyerOrderGiftcard (buyer) satisfy this.
 */
export interface CardStatusInput {
  isConfirmed: boolean;
  status: string;
  orderId: string | null;
}

// ── Navigation ────────────────────────────────────────────────────────────────

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
