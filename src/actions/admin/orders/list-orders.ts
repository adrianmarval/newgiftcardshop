'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { hashCode } from '@/lib/encryption';
import { adminActionClient } from '@/lib/safe-action';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { computeOrderGiftcardTotals } from '@/lib/services/pricing/pricing';
import { OrderStatus, GiftcardStatus, PaymentDirection, PaymentCategory, PaymentReferenceType } from '@/generated/prisma/enums';
import { paginatedOutputSchema } from '@/types';

const getAdminOrdersInputSchema = z.object({
  buyerId: z.string().nullable().optional(),
  status: z
    .enum(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const)
    .optional()
    .default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

const getAdminOrdersOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.string(),
      status: z.enum(OrderStatus),
      total: z.number(),
      adjustedTotal: z.number().nullable(),
      buyRate: z.number(),
      effectiveTotal: z.number(),
      faceValueTotal: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
      giftcards: z.array(
        z.object({
          id: z.string(),
          claimCode: z.string(),
          pinCode: z.string().nullable(),
          amount: z.number(),
          status: z.enum(GiftcardStatus),
          isConfirmed: z.boolean(),
          reportedAmount: z.number().nullable(),
          orderId: z.string().nullable(),
          batchId: z.number().nullable().optional(),
          brand: z.object({ name: z.string(), icon: z.string().nullable(), image: z.string().nullable() }),
          country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }),
          isSearchMatch: z.boolean().optional(),
          seller: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable(),
        }),
      ),
      payments: z.array(
        z.object({
          id: z.string(),
          amount: z.number(),
          balanceAfter: z.number(),
          direction: z.enum(PaymentDirection),
          category: z.enum(PaymentCategory),
          binanceTxId: z.string().optional(),
          relatedUserId: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.enum(PaymentReferenceType).optional(),
          referenceId: z.string().optional(),
          createdAt: z.string(),
        }),
      ),
      buyer: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        buyRate: z.number(),
        orderCount: z.number(),
        createdAt: z.string(),
        twoFactorEnabled: z.boolean(),
      }),
    }),
  ),
);

export const listOrders = adminActionClient
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

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true, twoFactorEnabled: true, twoFactor: true } },
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
    });

    const totalCount = await prisma.order.count({ where });

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
        const totals = computeOrderGiftcardTotals(order.giftcards, order.buyRate);
        const giftcards = order.giftcards.map((card) => {
          const { claimCode, pinCode } = decryptGiftcardCodes(card);

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
            reportedAmount: card.reportedAmount !== null ? Number(card.reportedAmount) : null,
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

        const payments = order.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          balanceAfter: Number(p.balanceAfter),
          direction: p.direction as PaymentDirection,
          category: p.category as PaymentCategory,
          binanceTxId: p.binanceTxId ?? undefined,
          relatedUserId: p.relatedUserId ?? undefined,
          notes: p.notes ?? undefined,
          referenceType: p.referenceType ?? undefined,
          referenceId: p.referenceId ?? undefined,
          createdAt: p.createdAt.toISOString(),
        }));

        return {
          id: order.id,
          status: order.status as OrderStatus,
          total: Number(order.total),
          adjustedTotal: order.adjustedTotal !== null ? Number(order.adjustedTotal) : null,
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
            buyRate: order.buyRate.toNumber(),
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
