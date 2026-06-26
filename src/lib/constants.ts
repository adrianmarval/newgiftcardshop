import type { Prisma } from '@/generated/prisma/client';

export const MAX_BATCH_SIZE = 50;

/**
 * Common Prisma filter for querying available (in-stock, unused) giftcards.
 * Use this instead of repeating `{ inStock: true, status: 'UNUSED' }` everywhere.
 */
export const AVAILABLE_GIFTCARD_WHERE = {
  inStock: true,
  status: 'UNUSED' as const,
} satisfies Prisma.GiftcardWhereInput;

