// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Claim Code parsing
// Normalización y validación de claim codes de gift cards.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resultado de parsear una línea del bulk paste.
 * Cada línea puede tener formato `CODIGO MONTO` o solo `CODIGO`.
 */
export interface ClaimCodeParseResult {
  /** Monto como string (undefined si la línea no tenía monto). */
  amount?: string;
  /** Código de reclamo parseado y canonicalizado (uppercase, sin guiones). */
  claimCode: string;
  /** Código PIN opcional. */
  pinCode?: string;
}

/**
 * Alias for ClaimCodeParseResult.
 * Used when parsing gift cards from bulk paste dialog.
 */
export type ParsedGiftcard = ClaimCodeParseResult;

/**
 * Resultado completo del parsing de múltiples líneas de códigos.
 */
export interface ParseClaimCodesResult {
  parsed: ParsedGiftcard[];
  errors: string[];
  duplicateCount: number;
  duplicates: string[];
}

/**
 * Normaliza un claim code:
 * - Convertido a uppercase
 * - Remueve espacios y guiones
 * - Validado contra regex de alphanumeric
 * - Validado contra longitud (12, 14, o 15 caracteres para Amazon)
 *
 * @param input - El claim code raw del usuario
 * @returns El código normalizado o null si es inválido
 */
export function normalizeClaimCode(input: string): string | null {
  const stripped = input.toUpperCase().replace(/[ -]/g, '');
  if (!/^[A-Z0-9]+$/.test(stripped)) return null;
  if (stripped.length !== 12 && stripped.length !== 14 && stripped.length !== 15) return null;
  return stripped;
}
