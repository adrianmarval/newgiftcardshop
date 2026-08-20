import type { Prisma } from '@/generated/prisma/client';

export const MAX_BATCH_SIZE = 50;

/**
 * Cookie que marca que el usuario ya pasó por la vista de setup de passkey
 * (configuró una o eligió "Ahora no"). La lee el server action `login` para
 * decidir si redirige a la vista intersticial post-login.
 */
export const PASSKEY_SETUP_COOKIE = 'passkey_setup_done';

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

