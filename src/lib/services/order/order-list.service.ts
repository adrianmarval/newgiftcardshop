// ─────────────────────────────────────────────────────────────────────────────
// Order List Service — Shared query + serialization for admin and buyer portals
// Single source of truth for listing orders with filters (status, search, dates).
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
import { computeOrderGiftcardTotals } from '@/lib/services/pricing';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import type { AdminOrder, BuyerOrder, GiftcardForList, ListOrdersServiceInput } from '@/types';
import { logger } from '@/lib/logger';

// ── Where builder (shared) ───────────────────────────────────────────────────

function buildOrderWhere(input: ListOrdersServiceInput): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (input.scope === 'buyer' && input.userId) {
    where.userId = input.userId;
  } else if (input.buyerId) {
    where.userId = input.buyerId;
  }

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) where.createdAt.lte = new Date(input.dateTo);
  }

  if (input.status && input.status !== 'ALL') where.status = input.status as Prisma.OrderWhereInput['status'];

  if (input.search) {
    const hashedSearch = hashCode(input.search.trim().toUpperCase());
    where.OR = [
      { id: { contains: input.search, mode: 'insensitive' } },
      {
        giftcards: {
          some: {
            OR: [
              { codeHash: hashedSearch },
              {
                brandCountry: {
                  brand: { name: { contains: input.search, mode: 'insensitive' } },
                },
              },
            ],
          },
        },
      },
    ];
  }

  return where;
}

// ── Giftcard serializer (shared) ─────────────────────────────────────────────

function serializeGiftcard(
  card: Prisma.GiftcardGetPayload<{
    include: {
      brandCountry: { include: { brand: true; country: true } };
      batch: { include: { user: { select: { id: true; name: true; email: true } } } };
    };
  }>,
  search: string | undefined,
) {
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
    status: card.status,
    isConfirmed: card.isConfirmed,
    reportedAmount: card.reportedAmount !== null ? Number(card.reportedAmount) : null,
    orderId: card.orderId,
    batchId: card.batchId ?? null,
    brand: {
      name: card.brandCountry.brand.name,
      icon: card.brandCountry.brand.icon,
      image: card.brandCountry.brand.image,
    },
    country: card.brandCountry.country
      ? {
          name: card.brandCountry.country.name,
          code: card.brandCountry.country.code,
          currency: card.brandCountry.country.currency,
        }
      : null,
    isSearchMatch,
    seller: card.batch?.user
      ? { id: card.batch.user.id, name: card.batch.user.name, email: card.batch.user.email }
      : null,
  } as GiftcardForList;
}

// ── Public service ───────────────────────────────────────────────────────────

export async function listOrdersService(input: ListOrdersServiceInput): Promise<{
  items: AdminOrder[] | BuyerOrder[];
  pagination: { currentPage: number; totalPages: number; totalCount: number };
}> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const skip = (page - 1) * limit;
  const orderBy: Prisma.OrderOrderByWithRelationInput = input.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

  const where = buildOrderWhere(input);

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          twoFactorEnabled: true,
        },
      },
      giftcards: {
        include: {
          brandCountry: { include: { brand: true, country: true } },
          batch: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
      payments: true,
    },
    orderBy,
    skip,
    take: limit,
  });

  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  // Admin-only: compute orderCount per buyer via groupBy
  let orderCountMap = new Map<string, number>();
  if (input.scope === 'admin') {
    const buyerIds = [...new Set(orders.map((o) => o.userId))];
    if (buyerIds.length > 0) {
      const counts = await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { in: buyerIds } },
        _count: { id: true },
      });
      orderCountMap = new Map(counts.map((c) => [c.userId, c._count.id]));
    }
  }

  const items = orders.map((order) => {
    const totals = computeOrderGiftcardTotals(order.giftcards, order.buyRate);
    const giftcards = order.giftcards.map((card) => serializeGiftcard(card, input.search));
    const payments = order.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      balanceAfter: Number(p.balanceAfter),
      direction: p.direction,
      category: p.category,
      binanceTxId: p.binanceTxId ?? null,
      isBinanceWallet: p.isBinanceWallet,
      relatedUserId: p.relatedUserId ?? null,
      notes: p.notes ?? null,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    const base = {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      adjustedTotal: order.adjustedTotal !== null ? Number(order.adjustedTotal) : null,
      buyRate: Number(order.buyRate),
      effectiveTotal: totals.effectiveTotal,
      faceValueTotal: totals.faceValueTotal,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      giftcards,
      payments,
    };

    if (input.scope === 'admin') {
      return {
        ...base,
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
    }

    return base;
  });

  logger.debug('listOrdersService', {
    flow: 'order',
    action: 'list-orders',
    userId: input.userId,
    metadata: { scope: input.scope, totalCount, returned: items.length },
  });

  return {
    items: items as unknown as AdminOrder[] | BuyerOrder[],
    pagination: { currentPage: page, totalPages, totalCount },
  };
}