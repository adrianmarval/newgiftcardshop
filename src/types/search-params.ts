// ─────────────────────────────────────────────────────────────────────────────
// Search Params Types — nuqs v2 parsers for buyer orders
// ─────────────────────────────────────────────────────────────────────────────

import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

// ── Parser Definitions ────────────────────────────────────────────────────────

export const orderSearchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringLiteral(["ALL", "PENDING", "AWAITING_PAYMENT", "COMPLETED", "CANCELLED"] as const).withDefault("ALL"),
  search: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["newest", "oldest"] as const).withDefault("newest"),
} as const;

// ── Derived Types ─────────────────────────────────────────────────────────────

export type OrderSearchParams = {
  page: number;
  status: "ALL" | "PENDING" | "AWAITING_PAYMENT" | "COMPLETED" | "CANCELLED";
  search: string;
  sort: "newest" | "oldest";
};

export type OrderSearchParamsKeys = keyof typeof orderSearchParamsParsers;
