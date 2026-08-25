import type { Prisma } from '@/generated/prisma/client';

export const MAX_BATCH_SIZE = 50;

/**
 * Dominio de emails sintéticos asignados por el script de migración
 * (tg_<telegramId>@legacy.migrated). Un usuario con este email NO tiene
 * acceso web (sin password ni inbox real) — el bot le ofrece el claim.
 */
export const LEGACY_EMAIL_DOMAIN = '@legacy.migrated';

/**
 * Minimum estimated payout (USD) required for external wallets.
 * Binance wallets are exempt from this restriction.
 */
export const WALLET_MIN_PAYOUT_EXTERNAL = 10;

/**
 * Common Prisma filter for querying available (in-stock, unused) giftcards.
 * Use this instead of repeating `{ inStock: true, status: 'UNUSED' }` everywhere.
 */
export const AVAILABLE_GIFTCARD_WHERE = {
  inStock: true,
  status: 'UNUSED' as const,
} satisfies Prisma.GiftcardWhereInput;

// ── Security PIN (buy flow code-reveal gate) ────────────────────────────────

/** Minutes a successful PIN/passkey verification unlocks code reveal (cross-channel). */
export const SECURITY_UNLOCK_MINUTES = 10;

/** Failed PIN attempts before the PIN is locked and must be reset via email OTP. */
export const PIN_MAX_ATTEMPTS = 5;

/** Minutes the PIN-reset email OTP stays valid. */
export const PIN_RESET_OTP_MINUTES = 10;

/** Seconds before a new PIN-reset OTP can be requested (Resend anti-spam). */
export const PIN_RESET_COOLDOWN_SECONDS = 60;

