// ─────────────────────────────────────────────────────────────────────────────
// Amount Range Validator — pure helper, shared between web and bot
// Pure function: no Prisma, no I/O. Validates card amounts against
// BrandCountry.minAmount / maxAmount limits.
// ─────────────────────────────────────────────────────────────────────────────

export interface AmountRangeViolation {
  /** Stable identifier (web uses card.id, bot uses parsed line number). */
  ref: string;
  claimCode: string;
  amount: number;
  violation: 'below_min' | 'above_max';
  minAmount: number | null;
  maxAmount: number | null;
}

export interface AmountRangeInput {
  /** Opaque identifier for the card (card.id in web, line number string in bot). */
  ref: string;
  claimCode: string;
  /** Stored as string in the store; service passes numbers — helper normalizes. */
  amount: string | number;
}

export interface AmountRangeLimits {
  minAmount: number | null;
  maxAmount: number | null;
}

function parseAmountSafe(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Strip $, then normalize comma-as-decimal to dot.
  // If there's a dot, commas are thousands separators → strip them.
  // If there's no dot, check if comma is thousands (e.g. 1,000) or decimal (e.g. 25,50).
  const withoutCurrency = trimmed.replace(/[$]/g, '');
  const hasDot = withoutCurrency.includes('.');
  const hasComma = withoutCurrency.includes(',');
  let normalized: string;
  if (hasDot) {
    // Dot present → commas are thousands separators → strip them
    normalized = withoutCurrency.replace(/,/g, '');
  } else if (hasComma) {
    // No dot but comma → check if it's thousands (1,000) or decimal (25,50)
    // Thousands: comma followed by exactly 3 digits and no other commas
    const isThousands = /^[0-9]{1,3}(,[0-9]{3})+$/.test(withoutCurrency);
    normalized = isThousands ? withoutCurrency.replace(/,/g, '') : withoutCurrency.replace(/,/g, '.');
  } else {
    normalized = withoutCurrency;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Returns the list of cards whose amount is outside the allowed range.
 * Cards with invalid/empty/NaN amounts are skipped (caller handles separately).
 * When both limits are null, the result is always empty.
 */
export function validateAmountsAgainstRange(
  cards: AmountRangeInput[],
  limits: AmountRangeLimits,
): AmountRangeViolation[] {
  const { minAmount, maxAmount } = limits;
  if (minAmount === null && maxAmount === null) return [];

  const violations: AmountRangeViolation[] = [];

  for (const card of cards) {
    const amount = parseAmountSafe(card.amount);
    if (amount === null) continue;

    if (minAmount !== null && amount < minAmount) {
      violations.push({
        ref: card.ref,
        claimCode: card.claimCode,
        amount,
        violation: 'below_min',
        minAmount,
        maxAmount,
      });
    } else if (maxAmount !== null && amount > maxAmount) {
      violations.push({
        ref: card.ref,
        claimCode: card.claimCode,
        amount,
        violation: 'above_max',
        minAmount,
        maxAmount,
      });
    }
  }

  return violations;
}

/**
 * Format a single violation for human display (toast/markdown/telegram).
 * Example: "ABC-1234-XYZ: $2.00 is below min $5.00"
 */
export function formatAmountRangeViolation(violation: AmountRangeViolation): string {
  if (violation.violation === 'below_min') {
    return `${violation.claimCode}: $${violation.amount.toFixed(2)} is below min $${violation.minAmount!.toFixed(2)}`;
  }
  return `${violation.claimCode}: $${violation.amount.toFixed(2)} is above max $${violation.maxAmount!.toFixed(2)}`;
}

/**
 * Format a list of violations as a multi-line block.
 * Shows ALL violations by default; pass `maxLines` to cap (with "…and N more" suffix).
 */
export function formatAmountRangeViolations(
  violations: AmountRangeViolation[],
  maxLines?: number,
): string {
  if (violations.length === 0) return '';
  const list =
    maxLines !== undefined && violations.length > maxLines
      ? violations.slice(0, maxLines)
      : violations;
  const remaining = violations.length - list.length;
  const body = list.map(formatAmountRangeViolation).join('\n');
  return remaining > 0 ? `${body}\n…and ${remaining} more` : body;
}

/**
 * Build the server-side error message (used by publish.service.ts).
 * No truncation — shows every violating card so the seller can fix them.
 */
export function buildAmountRangeErrorMessage(
  violations: AmountRangeViolation[],
  limits: AmountRangeLimits,
): string {
  const minMsg = limits.minAmount !== null ? `min $${limits.minAmount.toFixed(2)}` : '';
  const maxMsg = limits.maxAmount !== null ? `max $${limits.maxAmount.toFixed(2)}` : '';
  const range = [minMsg, maxMsg].filter(Boolean).join(', ');
  const detail = formatAmountRangeViolations(violations);
  return `${violations.length} card(s) have amounts outside the allowed range (${range}). ${detail}`;
}

