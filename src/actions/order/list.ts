'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import { buyerActionClient } from '@/lib/safe-action';
import type { OrderStatus } from '@/types/domain/order';
import type { Giftcard, GiftcardStatus } from '@/types/domain/giftcard';
import type { Payment, PaymentStatus } from '@/types/domain/payment';
import { getBuyerOrdersInputSchema, getBuyerOrdersOutputSchema } from '@/types/domain/order';

function computeEffectiveTotal(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
): number {
  const rawTotal = giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum.plus(card.amount);
    if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum;
  }, new Prisma.Decimal(0));
  return rawTotal.mul(buyRate).toNumber();
}

export const getBuyerOrders = buyerActionClient
  .inputSchema(getBuyerOrdersInputSchema)
  .outputSchema(getBuyerOrdersOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { page, limit, status, search, sort } = parsedInput;
    const skip = (page - 1) * limit;
    const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { createdAt: 'asc' as const };

    const where: Prisma.OrderWhereInput = { userId: ctx.auth.user.id };
    if (status) where.status = status;
    if (search) where.id = { contains: search, mode: 'insensitive' };

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          giftcards: { include: { brand: true, country: true } },
          payments: { where: { status: 'COMPLETED' } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true as const,
      items: orders.map((order) => {
        const effectiveTotal = computeEffectiveTotal(order.giftcards, order.buyRate);
        const giftcards: Giftcard[] = order.giftcards.map((card) => {
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
          return {
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
        });
        const payments: Payment[] = order.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          balanceAfter: Number(p.balanceAfter),
          status: p.status as PaymentStatus,
          createdAt: p.createdAt.toISOString(),
        }));
        return {
          id: order.id,
          status: order.status as OrderStatus,
          total: Number(order.total),
          adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
          buyRate: Number(order.buyRate),
          effectiveTotal,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          giftcards,
          payments,
        };
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
