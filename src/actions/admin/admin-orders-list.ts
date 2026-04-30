'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt, hashCode } from '@/lib/encryption';
import { adminActionClient } from '@/lib/safe-action';
import type { OrderStatus } from '@/types/domain/order';
import type { GiftcardStatus } from '@/types/domain/giftcard';
import type { Payment } from '@/types/domain/payment';
import { getAdminOrdersInputSchema, getAdminOrdersOutputSchema } from '@/types/domain/admin';

function computeTotals(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
) {
  const faceValueTotal = giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED' || card.status === 'USED') return sum.plus(card.amount);
    if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum;
  }, new Prisma.Decimal(0));
  return {
    faceValueTotal: faceValueTotal.toNumber(),
    effectiveTotal: faceValueTotal.mul(buyRate).toNumber(),
  };
}

export const adminOrders = adminActionClient
  .inputSchema(getAdminOrdersInputSchema)
  .outputSchema(getAdminOrdersOutputSchema)
  .action(async ({ parsedInput }) => {
    const { page, limit, status, search, buyerId, dateFrom, dateTo } = parsedInput;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (buyerId) where.userId = buyerId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (status && status !== 'ALL') where.status = status;

    if (search) {
      const hashedSearch = hashCode(search.trim().toUpperCase());
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        {
          giftcards: {
            some: {
              OR: [
                { codeHash: hashedSearch },
                {
                  brandCountry: {
                    brand: {
                      name: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, buyRate: true, createdAt: true, twoFactorEnabled: true, twoFactor: true } },
          giftcards: {
            include: {
              brandCountry: { include: { brand: true, country: true } },
              batch: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const buyerIds = [...new Set(orders.map((o) => o.userId))];
    const buyerOrderCounts =
      buyerIds.length > 0
        ? await prisma.order.groupBy({
            by: ['userId'],
            where: { userId: { in: buyerIds } },
            _count: { id: true },
          })
        : [];
    const orderCountMap = new Map(buyerOrderCounts.map((o) => [o.userId, o._count.id]));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true as const,
      items: orders.map((order) => {
        const totals = computeTotals(order.giftcards, order.buyRate);
        const giftcards = order.giftcards.map((card) => {
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

          let isSearchMatch = false;
          if (search) {
            const hashedSearch = hashCode(search.trim().toUpperCase());
            const matchesCode = card.codeHash === hashedSearch;
            const matchesBrand = card.brandCountry.brand.name.toLowerCase().includes(search.toLowerCase());
            isSearchMatch = matchesCode || matchesBrand;
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
              name: card.brandCountry.brand.name,
              icon: card.brandCountry.brand.icon,
              image: card.brandCountry.brand.image,
            },
            country: {
              name: card.brandCountry.country.name,
              code: card.brandCountry.country.code,
              currency: card.brandCountry.country.currency,
            },
            isSearchMatch,
            seller: card.batch?.user ? { id: card.batch.user.id, name: card.batch.user.name, email: card.batch.user.email } : null,
          };
        });

        const payments: Payment[] = order.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          balanceAfter: Number(p.balanceAfter),
          direction: p.direction,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        }));

        return {
          id: order.id,
          status: order.status as OrderStatus,
          total: Number(order.total),
          adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
          buyRate: Number(order.buyRate),
          effectiveTotal: totals.effectiveTotal,
          faceValueTotal: totals.faceValueTotal,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          giftcards,
          payments,
          buyer: {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
            buyRate: Number(order.user.buyRate),
            orderCount: orderCountMap.get(order.userId) ?? 0,
            createdAt: order.user.createdAt.toISOString(),
            twoFactorEnabled: order.user.twoFactorEnabled,
          },
        };
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
