import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export interface CreditCheckResult {
  allowed: boolean;
  unpaidTotal: Prisma.Decimal;
  availableCredit: Prisma.Decimal;
  creditLimit: Prisma.Decimal;
}

/**
 * Checks if a buyer has enough credit for a purchase.
 * Calculates total unpaid orders and compares against credit limit.
 *
 * @param tx - Optional Prisma transaction client. If provided, runs inside the transaction.
 */
export async function checkCreditLimit(
  userId: string,
  purchaseAmount: Prisma.Decimal,
  tx?: Prisma.TransactionClient,
): Promise<CreditCheckResult> {
  const client = tx ?? prisma;

  const user = await client.user.findUnique({
    where: { id: userId },
    select: { creditLimit: true },
  });

  if (!user) {
    return {
      allowed: false,
      unpaidTotal: new Prisma.Decimal(0),
      availableCredit: new Prisma.Decimal(0),
      creditLimit: new Prisma.Decimal(0),
    };
  }

  const unpaidOrders = await client.order.findMany({
    where: { userId, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
    select: { adjustedTotal: true, total: true },
  });

  const unpaidTotal = unpaidOrders.reduce(
    (sum, o) => sum.plus(o.adjustedTotal ?? o.total),
    new Prisma.Decimal(0),
  );

  const creditLimit = user.creditLimit;
  const availableCredit = creditLimit.minus(unpaidTotal);
  const allowed = unpaidTotal.plus(purchaseAmount).lte(creditLimit);

  return { allowed, unpaidTotal, availableCredit, creditLimit };
}

/**
 * Gets the total unpaid amount for a buyer (for display/pre-check purposes).
 */
export async function getUnpaidTotal(userId: string): Promise<Prisma.Decimal> {
  const unpaidOrders = await prisma.order.findMany({
    where: { userId, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
    select: { adjustedTotal: true, total: true },
  });

  return unpaidOrders.reduce(
    (sum, o) => sum.plus(o.adjustedTotal ?? o.total),
    new Prisma.Decimal(0),
  );
}
