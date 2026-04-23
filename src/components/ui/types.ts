// ─────────────────────────────────────────────────────────────────────────────
// UI Component Props — Props for shared UI components
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from 'react';
import type { CardStatusInput, NavItem, OrderStatus, Payment, StatsItem } from '@/types';
import type { Sidebar } from '@/components/ui/sidebar';

// ── Card Status Badge ─────────────────────────────────────────────────────────

export interface GiftcardStatusBadgeProps {
  card: CardStatusInput;
  orderStatus?: OrderStatus;
}

// ── GiftcardIssueAlert ────────────────────────────────────────────────────────

export interface GiftcardIssueAlertProps {
  status: string;
}

// ── UrlPagination ─────────────────────────────────────────────────────────────

export interface UrlPaginationProps {
  totalPages: number;
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
