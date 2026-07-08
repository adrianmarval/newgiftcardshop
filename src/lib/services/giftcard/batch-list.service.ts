// ─────────────────────────────────────────────────────────────────────────────
// Batch List Service — Shared query + serialization for admin and seller portals
// Single source of truth for listing batches with filters (status, search, dates).
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import type { ListBatchesServiceInput } from '@/types';
import { logger } from '@/lib/logger';

// ── Where builder (shared) ───────────────────────────────────────────────────

function buildBatchWhere(input: ListBatchesServiceInput): Prisma.GiftcardBatchWhereInput {
  const where: Prisma.GiftcardBatchWhereInput = {};

  if (input.scope === 'seller' && input.userId) {
    where.userId = input.userId;
  } else if (input.sellerId) {
    where.userId = input.sellerId;
  }

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) where.createdAt.lte = new Date(input.dateTo);
  }

  if (input.search) {
    const isNumericSearch = !isNaN(Number(input.search));
    const hashedSearch = hashCode(input.search.trim().toUpperCase());

    const searchClauses: Prisma.GiftcardBatchWhereInput[] = [
      ...(isNumericSearch ? [{ id: Number(input.search) }] : []),
    ];
    if (input.scope === 'admin') {
      searchClauses.push(
        { user: { name: { contains: input.search, mode: 'insensitive' } } },
        { user: { email: { contains: input.search, mode: 'insensitive' } } },
      );
    }
    searchClauses.push({
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
    });
    where.OR = searchClauses;
  }

  return where;
}

// ── Helper: build serialized giftcard with admin or seller shape ─────────────

function serializeBatchGiftcard(
  card: Prisma.GiftcardGetPayload<{
    include: {
      brandCountry: { include: { brand: true; country: true } };
      order: { select: { id: true; status: true; userId: true } };
      issues: true;
    };
  }>,
  search: string | undefined,
  buyerUsersMap: Map<string, { id: string; name: string; email: string }>,
  includeAdminFields: boolean,
) {
  const { claimCode, pinCode } = decryptGiftcardCodes(card);

  let isSearchMatch = false;
  if (search) {
    const hashedSearch = hashCode(search.trim().toUpperCase());
    const matchesCode = card.codeHash === hashedSearch;
    const matchesBrand = card.brandCountry.brand.name.toLowerCase().includes(search.toLowerCase());
    isSearchMatch = matchesCode || matchesBrand;
  }

  const base = {
    id: card.id,
    claimCode,
    pinCode,
    amount: Number(card.amount),
    status: card.status,
    isConfirmed: card.isConfirmed,
    reportedAmount: card.reportedAmount !== null ? Number(card.reportedAmount) : null,
    orderId: card.orderId,
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
  };

  if (!includeAdminFields) return base;

  const buyer =
    card.order?.userId
      ? (() => {
          const b = buyerUsersMap.get(card.order!.userId);
          return b ? { id: b.id, name: b.name, email: b.email } : null;
        })()
      : null;

  return {
    ...base,
    buyer,
    order: card.order ? { id: card.order.id, status: card.order.status } : null,
    issues: card.issues.map((issue) => ({
      id: issue.id,
      issueType: issue.issueType,
      reportedAmount: issue.reportedAmount !== null ? Number(issue.reportedAmount) : null,
      proofImageUrl: issue.proofImageUrl,
      giftcardId: issue.giftcardId,
      orderId: issue.orderId,
      reportedById: issue.reportedById,
      sellerId: issue.sellerId,
      createdAt: issue.createdAt.toISOString(),
    })),
  };
}

// ── Public service ───────────────────────────────────────────────────────────

export async function listBatchesService(input: ListBatchesServiceInput): Promise<{
  items: Record<string, unknown>[];
  pagination: { currentPage: number; totalPages: number; totalCount: number };
}> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const skip = (page - 1) * limit;
  const orderBy: Prisma.GiftcardBatchOrderByWithRelationInput = { createdAt: 'desc' };
  if (input.sort === 'oldest' || input.sort === 'amount_low') orderBy.createdAt = 'asc';

  const where = buildBatchWhere(input);

  const batches = await prisma.giftcardBatch.findMany({
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
          order: { select: { id: true, status: true, userId: true } },
          issues: true,
        },
      },
      payments: true,
    },
    orderBy,
    skip,
    take: limit,
  });

  const totalCount = await prisma.giftcardBatch.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  // Admin-only: fetch buyer users (one query, then map)
  let buyerUsersMap = new Map<string, { id: string; name: string; email: string }>();
  if (input.scope === 'admin') {
    const buyerUserIds = [
      ...new Set(
        batches.flatMap((b) =>
          b.giftcards.filter((c) => c.order?.userId).map((c) => c.order!.userId),
        ),
      ),
    ];
    if (buyerUserIds.length > 0) {
      const buyers = await prisma.user.findMany({
        where: { id: { in: buyerUserIds } },
        select: { id: true, name: true, email: true },
      });
      buyerUsersMap = new Map(buyers.map((u) => [u.id, u]));
    }
  }

  const items = batches.map((batch) => {
    const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
    const paidCount = batch.giftcards.filter((g) => g.status === 'USED').length;
    const hasIssues = batch.giftcards.some((g) => g.issues.length > 0);
    const effectiveTotalDecimal = computeFaceValueTotal(batch.giftcards);
    const effectiveTotal = effectiveTotalDecimal.toNumber();
    const estimatedPayout = effectiveTotalDecimal.mul(batch.sellRate).toNumber();
    const cardsCount = batch.giftcards.length;

    const giftcards = batch.giftcards.map((card) =>
      serializeBatchGiftcard(card, input.search, buyerUsersMap, input.scope === 'admin'),
    );

    const payments = batch.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      balanceAfter: Number(p.balanceAfter),
      direction: p.direction,
      category: p.category,
      binanceTxId: p.binanceTxId ?? null,
      relatedUserId: p.relatedUserId ?? null,
      notes: p.notes ?? null,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    if (input.scope === 'admin') {
      const seller = batch.user
        ? {
            id: batch.user.id,
            name: batch.user.name,
            email: batch.user.email,
            sellRate: batch.sellRate.toNumber(),
            orderCount: 0,
            createdAt: batch.user.createdAt.toISOString(),
            twoFactorEnabled: batch.user.twoFactorEnabled,
          }
        : {
            id: '',
            name: 'Unknown',
            email: '',
            sellRate: 0,
            orderCount: 0,
            createdAt: '',
            twoFactorEnabled: false,
          };

      return {
        id: batch.id,
        sellRate: Number(batch.sellRate),
        isPaid: batch.isPaid,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt?.toISOString(),
        seller,
        giftcards,
        payments,
        effectiveTotal,
        estimatedPayout,
        cardsCount,
        confirmedCount,
        paidCount,
        hasIssues,
        currency: batch.giftcards[0]?.brandCountry?.country?.currency || 'USD',
      };
    }

    // seller scope
    return {
      id: batch.id,
      userId: batch.userId,
      sellRate: Number(batch.sellRate),
      isPaid: batch.isPaid,
      createdAt: batch.createdAt.toISOString(),
      giftcards,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        balanceAfter: p.balanceAfter,
        direction: p.direction,
        category: p.category,
        createdAt: p.createdAt,
      })),
      effectiveTotal,
      estimatedPayout,
      cardsCount,
      confirmedCount,
      paidCount,
      hasIssues,
    };
  });

  // Post-filter by status (computed from batch fields, not queryable in SQL efficiently)
  let filtered = items;
  if (input.status && input.status !== 'ALL') {
    filtered = filtered.filter((b) => {
      const batch = b as {
        isPaid: boolean;
        confirmedCount: number;
        cardsCount: number;
        hasIssues: boolean;
      };
      switch (input.status) {
        case 'PROCESSING':
          return !batch.isPaid && batch.confirmedCount < batch.cardsCount;
        case 'CONFIRMED':
          if (input.scope === 'admin') {
            return !batch.isPaid && batch.confirmedCount === batch.cardsCount;
          }
          return !batch.isPaid && batch.confirmedCount === batch.cardsCount && !batch.hasIssues;
        case 'PAID':
          return batch.isPaid;
        case 'REPORTED':
        case 'WITH_ISSUES':
          return batch.hasIssues;
        default:
          return true;
      }
    });
  }

  // Admin-only: post-filter by amount range
  if (input.scope === 'admin' && (input.amountMin !== undefined || input.amountMax !== undefined)) {
    const min = input.amountMin ?? 0;
    const max = input.amountMax ?? Infinity;
    filtered = filtered.filter((b) => {
      const total = (b as { effectiveTotal: number }).effectiveTotal;
      return total >= min && total <= max;
    });
  }

  logger.debug('listBatchesService', {
    flow: 'batch',
    action: 'list-batches',
    userId: input.userId,
    metadata: { scope: input.scope, totalCount, returned: filtered.length },
  });

  return {
    items: filtered,
    pagination: { currentPage: page, totalPages, totalCount },
  };
}