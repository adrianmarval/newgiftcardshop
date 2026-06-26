'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { PaymentDirection, PaymentCategory } from '@/generated/prisma/enums';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { brandSchema, countrySchema, paymentDetailListItemSchema, paginatedOutputSchema } from '@/types';

const adminBatchGiftcardSchema = z.object({
  id: z.string(),
  claimCode: z.string(),
  pinCode: z.string().nullable(),
  amount: z.number(),
  status: z.string(),
  isConfirmed: z.boolean(),
  reportedAmount: z.number().nullable(),
  orderId: z.string().nullable(),
  brand: brandSchema,
  country: countrySchema.nullable(),
  buyer: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable(),
  order: z.object({ id: z.string(), status: z.string() }).nullable(),
  issues: z.array(z.object({
    id: z.string(), issueType: z.string(), reportedAmount: z.number().nullable(),
    proofImageUrl: z.string().nullable(), giftcardId: z.string(), orderId: z.string(),
    reportedById: z.string(), sellerId: z.string().nullable(), createdAt: z.string(),
  })),
  isSearchMatch: z.boolean().optional(),
});

const listBatchesInputSchema = z.object({
  sellerId: z.string().nullable().optional(),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'WITH_ISSUES']).optional().default('ALL'),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  amountMin: z.number().nullable().optional(),
  amountMax: z.number().nullable().optional(),
  search: z.string().optional().default(''),
  sort: z.enum(['newest', 'oldest', 'amount_high', 'amount_low']).optional().default('newest'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

const listBatchesOutputSchema = paginatedOutputSchema(
  z.array(z.object({
    id: z.number(),
    sellRate: z.number(),
    isPaid: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    seller: z.object({ id: z.string(), name: z.string(), email: z.string(), sellRate: z.number(), orderCount: z.number(), createdAt: z.string(), twoFactorEnabled: z.boolean() }),
    giftcards: z.array(adminBatchGiftcardSchema),
    payments: z.array(paymentDetailListItemSchema),
    effectiveTotal: z.number(),
    estimatedPayout: z.number(),
    cardsCount: z.number(),
    confirmedCount: z.number(),
    paidCount: z.number(),
    hasIssues: z.boolean(),
    currency: z.string(),
  })),
);

export const listBatches = adminActionClient.inputSchema(listBatchesInputSchema).outputSchema(listBatchesOutputSchema).action(async ({ parsedInput }) => {
  try {
    const { page, limit, search, sort, sellerId, status, dateFrom, dateTo, amountMin, amountMax } = parsedInput;
    const skip = (page - 1) * limit;

    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'amount_high'
          ? { createdAt: 'desc' as const }
          : sort === 'amount_low'
            ? { createdAt: 'asc' as const }
            : { createdAt: 'desc' as const };

    const where: Prisma.GiftcardBatchWhereInput = {};

    if (sellerId) where.userId = sellerId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      const isNumericSearch = !isNaN(Number(search));
      const hashedSearch = hashCode(search.trim().toUpperCase());

      where.OR = [
        ...(isNumericSearch ? [{ id: Number(search) }] : []),
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
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

    const batches = await prisma.giftcardBatch.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true, twoFactorEnabled: true, twoFactor: true } },
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

    const buyerUserIds = [...new Set(batches.flatMap((b) => b.giftcards.filter((c) => c.order?.userId).map((c) => c.order!.userId)))];
    const buyerUsers =
      buyerUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: buyerUserIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const buyerUsersMap = new Map(buyerUsers.map((u) => [u.id, u]));

    const filteredBatches = batches.map((batch) => {
      const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
      const paidCount = batch.giftcards.filter((g) => g.status === 'USED').length;
      const hasIssues = batch.giftcards.some((g) => g.issues.length > 0);

      const effectiveTotalDecimal = computeFaceValueTotal(batch.giftcards);
      const effectiveTotal = effectiveTotalDecimal.toNumber();

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
        : { id: '', name: 'Unknown', email: '', sellRate: 0, orderCount: 0, createdAt: '', twoFactorEnabled: false };

      const giftcards = batch.giftcards.map((card) => {
        const { claimCode, pinCode } = decryptGiftcardCodes(card);

        let buyer: { id: string; name: string; email: string } | null = null;
        if (card.order?.userId) {
          const buyerUser = buyerUsersMap.get(card.order.userId);
          if (buyerUser) {
            buyer = { id: buyerUser.id, name: buyerUser.name, email: buyerUser.email };
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
            ? { name: card.brandCountry.country.name, code: card.brandCountry.country.code, currency: card.brandCountry.country.currency }
            : null,
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
          isSearchMatch,
        };
      });

      return {
        id: batch.id,
        sellRate: Number(batch.sellRate),
        isPaid: batch.isPaid || batch.payments.length > 0,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt?.toISOString(),
        seller,
        giftcards,
        payments: batch.payments.map((p) => ({
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
        })),
        effectiveTotal,
        estimatedPayout: effectiveTotalDecimal.mul(batch.sellRate).toNumber(),
        cardsCount: batch.giftcards.length,
        confirmedCount,
        paidCount,
        hasIssues,
        currency: batch.giftcards[0]?.brandCountry?.country?.currency || 'USD',
      };
    });

    let filteredByStatus = filteredBatches;
    if (status && status !== 'ALL') {
      filteredByStatus = filteredBatches.filter((b) => {
        if (status === 'PROCESSING') return !b.isPaid && b.confirmedCount < b.cardsCount;
        if (status === 'CONFIRMED') return !b.isPaid && b.confirmedCount === b.cardsCount;
        if (status === 'PAID') return b.isPaid;
        if (status === 'WITH_ISSUES') return b.hasIssues;
        return true;
      });
    }

    let filteredByAmount = filteredByStatus;
    const minAmount = amountMin ?? 0;
    const maxAmount = amountMax ?? Infinity;
    if (amountMin !== undefined || amountMax !== undefined) {
      filteredByAmount = filteredByStatus.filter((b) => b.effectiveTotal >= minAmount && b.effectiveTotal <= maxAmount);
    }

    return {
      success: true as const,
      items: filteredByAmount,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  } catch (error) {
    console.error('[listBatches]', error);
    throw new ActionError('Error al obtener los lotes.');
  }
});
