// ─────────────────────────────────────────────────────────────────────────────
// UI Types — Feedback and display components
// ─────────────────────────────────────────────────────────────────────────────

import type * as React from "react";

// ── Stats Grid ────────────────────────────────────────────────────────────────

export interface StatsItem {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color?: string;
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
