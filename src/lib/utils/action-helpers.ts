// ─────────────────────────────────────────────────────────────────────────────
// Shared Action Helpers — Serialization utilities for giftcards and payments
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import type { Giftcard, GiftcardStatus } from '@/types/domain/giftcard';
import type { Payment, PaymentStatus } from '@/types/domain/payment';

/**
 * Serializes a giftcard for client output.
 * Includes decrypting claimCode/pinCode and converting Decimals to numbers.
 * Return type is explicitly tied to the Giftcard schema — if the schema
 * changes, this function will break at compile time, not at runtime.
 */
export function serializeGiftcard(card: {
  id: string;
  claimCode: string;
  pinCode: string | null;
  amount: Prisma.Decimal;
  reportedAmount: Prisma.Decimal | null;
  status: string;
  isConfirmed: boolean;
  orderId: string | null;
  batchId?: string | null;
  brand: { name: string; icon: string; image: string | null };
  country: { name: string; code: string } | null;
}): Giftcard {
  let claimCode = card.claimCode;
  let pinCode = card.pinCode ?? null;
  try {
    claimCode = decrypt(card.claimCode);
  } catch {
    /* legacy unencrypted */
  }
  if (card.pinCode) {
    try {
      pinCode = decrypt(card.pinCode);
    } catch {
      pinCode = card.pinCode;
    }
  }

  // Build result explicitly to ensure type safety
  const giftcard: Giftcard = {
    id: card.id,
    claimCode,
    pinCode,
    amount: Number(card.amount),
    status: card.status as GiftcardStatus,
    isConfirmed: card.isConfirmed,
    reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
    orderId: card.orderId,
    batchId: card.batchId ?? undefined,
    brand: {
      name: card.brand.name,
      icon: card.brand.icon,
      image: card.brand.image,
    },
    country: card.country,
  };

  return giftcard;
}

/**
 * Serializes a payment for client output.
 * Converts Decimals to numbers and formats the date.
 * Return type is explicitly tied to the Payment schema — if the schema
 * changes, this function will break at compile time, not at runtime.
 */
export function serializePayment(payment: {
  id: string;
  amount: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  status: string;
  createdAt: Date;
}): Payment {
  return {
    id: payment.id,
    amount: Number(payment.amount),
    balanceAfter: Number(payment.balanceAfter),
    status: payment.status as PaymentStatus,
    createdAt: payment.createdAt.toISOString(),
  } as Payment;
}
