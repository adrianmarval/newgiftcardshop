import type { Prisma } from '@/generated/prisma/client';

export const MAX_BATCH_SIZE = 50;

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

