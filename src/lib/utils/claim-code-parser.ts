// ─────────────────────────────────────────────────────────────────────────────
// Claim Code Parser — Pure utility, zero UI dependencies
// Safe to import from server actions, Zustand stores, or React components.
//
// Normalization rules (Amazon gift-card claim codes):
//   1. Trim outer whitespace.
//   2. Uppercase all letters.
//   3. Strip spaces and hyphens only (no other character removal).
//   4. Accept 12-, 14-, or 15-character alphanumeric bodies.
//   5. Canonical display format: 4-4-4 (12-char), 4-6-4 (14-char), or 4-6-5 (15-char).
//   6. Dedup keys always use the normalized unformatted string.
// ─────────────────────────────────────────────────────────────────────────────

import type { ParsedGiftcard, ParseClaimCodesResult } from '@/types/domain/giftcard';

// Matches a sequence of alphanumeric chars + hyphens totalling 14 or 15
// alphanumeric chars after stripping the separators.
// Space is intentionally excluded from the middle character class so that
// the amount token that follows a code (e.g. "HPGE-JV9RR4-8SA9 30") is not
// consumed into the candidate match.
const CANDIDATE_RE = /[A-Z0-9][A-Z0-9-]{12,17}[A-Z0-9]/gi;

// Amount: optional leading $ or currency symbol, decimal number
const AMOUNT_RE = /\$?\s*(\d+(?:\.\d{1,2})?)/;

/**
 * Normalises an Amazon claim code string:
 * - Uppercases letters
 * - Removes spaces and hyphens
 * - Returns the 14- or 15-char body, or null if invalid
 */
export function normalizeClaimCode(input: string): string | null {
  const stripped = input.toUpperCase().replace(/[ -]/g, '');
  if (!/^[A-Z0-9]+$/.test(stripped)) return null;
  if (stripped.length !== 14 && stripped.length !== 15) return null;
  return stripped;
}

/**
 * Formats a normalized (14 or 15 char alphanumeric) claim code for display.
 * 14-char → XXXX-XXXXXX-XXXX    (4-6-4)
 * 15-char → XXXX-XXXXXX-XXXXX   (4-6-5)
 */
export function formatClaimCodeCanonical(normalized: string): string {
  // 4-6-remainder (covers 14 and 15 chars)
  const part1 = normalized.slice(0, 4);
  const part2 = normalized.slice(4, 10);
  const part3 = normalized.slice(10);
  return `${part1}-${part2}-${part3}`;
}

/**
 * Parses raw pasted text into gift cards.
 *
 * Scans each line for a valid Amazon claim-code candidate (12, 14, or 15 chars
 * alphanumeric after stripping separators). A trailing amount token on the same
 * line is extracted only from the text that follows the matched code, so digits
 * embedded in the code itself are never misinterpreted as the amount.
 * Deduplicates by normalized key — first occurrence wins.
 *
 * Returns:
 *   - `parsed[]`       — unique, canonical-formatted cards ready for import
 *   - `errors[]`       — human-readable messages for unparseable lines
 *   - `duplicateCount` — intra-paste duplicates silently dropped
 */
export function parseClaimCodes(raw: string): ParseClaimCodesResult {
  const parsed: ParsedGiftcard[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;
  const duplicates: string[] = [];

  const seen = new Set<string>();
  const seenLines = new Map<string, number>();

  const lines = raw.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Find all candidate substrings in the line (case-insensitive scan)
    const candidateRe = new RegExp(CANDIDATE_RE.source, 'gi');
    const candidateMatches = [...trimmedLine.matchAll(candidateRe)];

    let foundCode: string | null = null;
    let matchEnd = 0;
    for (const cm of candidateMatches) {
      const candidate = cm[0];
      const normalized = normalizeClaimCode(candidate);
      if (normalized) {
        foundCode = normalized;
        matchEnd = (cm.index ?? 0) + cm[0].length;
        break;
      }
    }

    if (!foundCode) {
      errors.push(`Line ${lineIdx + 1}: No valid claim code found — "${trimmedLine.slice(0, 40)}"`);
      continue;
    }

    // Deduplicate within this paste
    if (seen.has(foundCode)) {
      duplicateCount++;
      duplicates.push(`Duplicate card on line ${lineIdx + 1}`);
      continue;
    }

    // Extract amount only from text that trails the matched code token.
    // This prevents digits inside the code itself from being read as the amount.
    const remainder = trimmedLine.slice(matchEnd);
    const amountMatch = AMOUNT_RE.exec(remainder);
    const amount = amountMatch ? amountMatch[1] : undefined;

    seen.add(foundCode);
    parsed.push({
      claimCode: formatClaimCodeCanonical(foundCode),
      amount,
    });
  }

  if (parsed.length === 0 && errors.length === 0) {
    errors.push('No valid gift card codes found. Expected format: CODE AMOUNT (one per line)');
  }

  return { parsed, errors, duplicateCount, duplicates };
}
