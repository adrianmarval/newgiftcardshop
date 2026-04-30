'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt, hashCode } from '@/lib/encryption';
import { buyerActionClient } from '@/lib/safe-action';
import type { OrderStatus } from '@/types/domain/order';
import type { Giftcard, GiftcardStatus } from '@/types/domain/giftcard';
import type { Payment } from '@/types/domain/payment';
import { getBuyerOrdersInputSchema, getBuyerOrdersOutputSchema } from '@/types/domain/order';

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

export const getBuyerOrders = buyerActionClient
  .inputSchema(getBuyerOrdersInputSchema)
  .outputSchema(getBuyerOrdersOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { page, limit, status, search, sort } = parsedInput;
    const skip = (page - 1) * limit;
    const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { createdAt: 'asc' as const };

    const where: Prisma.OrderWhereInput = { userId: ctx.auth.user.id };
    if (status) where.status = status;
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

    const orders = await prisma.order.findMany({
      where,
      include: {
        giftcards: { include: { brandCountry: { include: { brand: true, country: true } } } },
        payments: true,
      },
      orderBy,
      skip,
      take: limit,
    });
    const totalCount = await prisma.order.count({ where });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true as const,
      items: orders.map((order) => {
        const totals = computeTotals(order.giftcards, order.buyRate);
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
          // Flag if this card matches the search
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
        };
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
