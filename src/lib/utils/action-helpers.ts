// ─────────────────────────────────────────────────────────────────────────────
// Shared Action Helpers — Serialization utilities for giftcards and payments
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import type { Giftcard, GiftcardStatus } from '@/types';
import type { Payment, PaymentDirection, PaymentCategory } from '@/types';
import { GiftcardStatus as GiftcardStatusEnum } from '@/generated/prisma/enums';

/**
 * Computes face value and effective totals from a list of giftcards.
 * - UNUSED/USED cards contribute their nominal amount
 * - WRONG_AMOUNT cards contribute their reportedAmount (if available)
 * - Other statuses (ALREADY_USED, INVALID, DEACTIVATED) contribute 0
 * Returns both the face value total and effective total (faceValue * rate).
 */
export function computeOrderGiftcardTotals(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  rate: Prisma.Decimal,
) {
  const faceValueTotal = giftcards.reduce((sum, card) => {
    if (card.status === GiftcardStatusEnum.UNUSED || card.status === GiftcardStatusEnum.USED) {
      return sum.plus(card.amount);
    }
    if (card.status === GiftcardStatusEnum.WRONG_AMOUNT) {
      return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    }
    return sum;
  }, new Prisma.Decimal(0));

  return {
    faceValueTotal: faceValueTotal.toNumber(),
    effectiveTotal: faceValueTotal.mul(rate).toNumber(),
  };
}

/**
 * Computes the effective total (face value * rate) from a list of giftcards.
 * - UNUSED cards contribute their nominal amount
 * - WRONG_AMOUNT cards contribute their reportedAmount (if available)
 * - Other statuses contribute 0
 * Returns effectiveTotal as Decimal (for database operations).
 */
export function computeEffectiveTotalDecimal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  rate: Prisma.Decimal,
): Prisma.Decimal {
  const faceValueTotal = giftcards.reduce((sum, card) => {
    if (card.status === GiftcardStatusEnum.UNUSED) {
      return sum.plus(card.amount);
    }
    if (card.status === GiftcardStatusEnum.WRONG_AMOUNT) {
      return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    }
    return sum;
  }, new Prisma.Decimal(0));

  return faceValueTotal.mul(rate);
}

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
  country: { name: string; code: string; currency: string | null } | null;
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
    batchId: card.batchId ? Number(card.batchId) : null,
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
  direction: string;
  category: string;
  createdAt: Date;
}): Payment {
  return {
    id: payment.id,
    amount: Number(payment.amount),
    balanceAfter: Number(payment.balanceAfter),
    direction: payment.direction as PaymentDirection,
    category: payment.category as PaymentCategory,
    createdAt: payment.createdAt.toISOString(),
  };
}
