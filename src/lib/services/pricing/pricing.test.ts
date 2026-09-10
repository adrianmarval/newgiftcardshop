import { describe, it, expect } from 'vitest';
import { Prisma } from '@/generated/prisma/client';
import {
  computeFaceValueTotal,
  computeOrderGiftcardTotals,
  computeEffectiveTotalDecimal,
} from './pricing';
import type { GiftcardLike } from '@/types';

const dec = (n: number) => new Prisma.Decimal(n);

function card(status: GiftcardLike['status'], amount: number, reportedAmount: number | null = null): GiftcardLike {
  return { status, amount: dec(amount), reportedAmount: reportedAmount === null ? null : dec(reportedAmount) };
}

describe('computeFaceValueTotal', () => {
  it('suma el monto nominal de cards UNUSED y USED', () => {
    const total = computeFaceValueTotal([card('UNUSED', 10), card('USED', 25)]);
    expect(total.toNumber()).toBe(35);
  });

  it('WRONG_AMOUNT contribuye su reportedAmount (saldo real)', () => {
    const total = computeFaceValueTotal([card('WRONG_AMOUNT', 10, 7.5)]);
    expect(total.toNumber()).toBe(7.5);
  });

  it('WRONG_AMOUNT sin reportedAmount contribuye 0', () => {
    const total = computeFaceValueTotal([card('WRONG_AMOUNT', 10, null)]);
    expect(total.toNumber()).toBe(0);
  });

  it('reportedAmount puede SUPERAR el valor facial (seller under-declared)', () => {
    const total = computeFaceValueTotal([card('WRONG_AMOUNT', 10, 11)]);
    expect(total.toNumber()).toBe(11);
  });

  it('ALREADY_USED, INVALID y DEACTIVATED contribuyen 0', () => {
    const total = computeFaceValueTotal([
      card('ALREADY_USED', 10),
      card('INVALID', 20),
      card('DEACTIVATED', 30),
    ]);
    expect(total.toNumber()).toBe(0);
  });

  it('lista vacía = 0', () => {
    expect(computeFaceValueTotal([]).toNumber()).toBe(0);
  });
});

describe('computeOrderGiftcardTotals', () => {
  it('devuelve faceValue y effective (faceValue * rate) como numbers', () => {
    const { faceValueTotal, effectiveTotal } = computeOrderGiftcardTotals(
      [card('UNUSED', 100)],
      dec(0.95),
    );
    expect(faceValueTotal).toBe(100);
    expect(effectiveTotal).toBe(95);
  });
});

describe('computeEffectiveTotalDecimal', () => {
  it('devuelve Decimal para operaciones de DB', () => {
    const total = computeEffectiveTotalDecimal([card('UNUSED', 50), card('UNUSED', 50)], dec(0.8));
    expect(total).toBeInstanceOf(Prisma.Decimal);
    expect(total.toNumber()).toBe(80);
  });

  it('precisión decimal: 0.57 * 100 no introduce float artifacts', () => {
    const total = computeEffectiveTotalDecimal([card('UNUSED', 100)], dec(0.57));
    expect(total.toString()).toBe('57');
  });
});
