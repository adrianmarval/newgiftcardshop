'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { hashCode } from '@/lib/encryption';
import { buyerActionClient } from '@/lib/safe-action';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { computeOrderGiftcardTotals } from '@/lib/services/pricing/pricing';
import { GiftcardStatus, OrderStatus } from '@/generated/prisma/enums';

const listOrdersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(OrderStatus).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

const listOrdersOutputSchema = z.object({
  success: z.literal(true),
  items: z.array(z.object({
    id: z.string(), status: z.string(), total: z.number(), adjustedTotal: z.number().nullable(),
    buyRate: z.number(), effectiveTotal: z.number(), faceValueTotal: z.number(),
    createdAt: z.string(), updatedAt: z.string(),
    giftcards: z.array(z.any()),
    payments: z.array(z.any()),
  })),
  pagination: z.object({ currentPage: z.number(), totalPages: z.number(), totalCount: z.number() }),
});

export const listOrders = buyerActionClient.inputSchema(listOrdersInputSchema).outputSchema(listOrdersOutputSchema).action(async ({ ctx, parsedInput }) => {
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
      const totals = computeOrderGiftcardTotals(order.giftcards, order.buyRate);
      const giftcards = order.giftcards.map((card) => {
        const { claimCode, pinCode } = decryptGiftcardCodes(card);
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
      const payments = order.payments.map((p) => ({
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
