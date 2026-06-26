import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { OrderNotFoundError, UnauthorizedError } from './order-errors';

/**
 * Finds an order by ID, verifies ownership, and returns it with giftcards.
 * Throws typed errors for not found or unauthorized.
 */
export async function findOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { giftcards: true },
  });

  if (!order) throw new OrderNotFoundError();
  if (order.userId !== userId) throw new UnauthorizedError();

  return order;
}

/**
 * Checks if an order can be cancelled (no active cards with value).
 */
export function canCancelOrder(giftcards: { status: string; reportedAmount: Prisma.Decimal | null }[]): boolean {
  return !giftcards.some((g) => {
    if (g.status === 'UNUSED' || g.status === 'USED') return true;
    if (g.status === 'WRONG_AMOUNT' && g.reportedAmount && g.reportedAmount.toNumber() > 0) return true;
    return false;
  });
}
