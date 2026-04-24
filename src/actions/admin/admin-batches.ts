'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import { adminActionClient } from '@/lib/safe-action';
import { adminBatchesFiltersSchema, adminBatchesOutputSchema } from '@/types/domain/admin';

export const adminBatches = adminActionClient
  .inputSchema(adminBatchesFiltersSchema)
  .outputSchema(adminBatchesOutputSchema)
  .action(async ({ parsedInput }) => {
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
      const searchNum = Number(search);
      const isNumericSearch = !isNaN(searchNum);
      where.OR = [
        isNumericSearch ? { id: searchNum } : { id: 0 },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [batches, totalCount] = await prisma.$transaction([
      prisma.giftcardBatch.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          giftcards: {
            include: {
              brand: true,
              country: true,
              order: { select: { id: true, status: true, userId: true } },
              issues: true,
            },
          },
          payments: { where: { status: 'COMPLETED' } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.giftcardBatch.count({ where }),
    ]);

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
      const allConfirmed = confirmedCount === batch.giftcards.length && batch.giftcards.length > 0;
      const hasIssues = batch.giftcards.some((g) => g.issues.length > 0);

      const effectiveTotal = batch.giftcards.reduce((sum, card) => {
        if (card.status === 'WRONG_AMOUNT') return sum + Number(card.reportedAmount ?? 0);
        if (card.status === 'USED' || card.status === 'UNUSED') return sum + Number(card.amount);
        return sum;
      }, 0);

      const seller = batch.user
        ? { id: batch.user.id, name: batch.user.name, email: batch.user.email }
        : { id: '', name: 'Unknown', email: '' };

      const giftcards = batch.giftcards.map((card) => {
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

        let buyer: { id: string; name: string; email: string } | null = null;
        if (card.order?.userId) {
          const buyerUser = buyerUsersMap.get(card.order.userId);
          if (buyerUser) {
            buyer = { id: buyerUser.id, name: buyerUser.name, email: buyerUser.email };
          }
        }

        return {
          id: card.id,
          claimCode,
          pinCode,
          amount: Number(card.amount),
          status: card.status,
          isConfirmed: card.isConfirmed,
          reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
          orderId: card.orderId,
          brand: {
            name: card.brand.name,
            icon: card.brand.icon,
            image: card.brand.image,
          },
          country: card.country ? { name: card.country.name, code: card.country.code } : null,
          buyer,
          order: card.order ? { id: card.order.id, status: card.order.status } : null,
          issues: card.issues.map((issue) => ({
            id: issue.id,
            issueType: issue.issueType,
            reportedAmount: issue.reportedAmount ? Number(issue.reportedAmount) : null,
            proofImageUrl: issue.proofImageUrl,
            giftcardId: issue.giftcardId,
            orderId: issue.orderId,
            reportedById: issue.reportedById,
            sellerId: issue.sellerId,
            createdAt: issue.createdAt.toISOString(),
          })),
        };
      });

      let batchStatus: 'PROCESSING' | 'CONFIRMED' | 'PAID' | 'WITH_ISSUES' = 'PROCESSING';
      if (batch.isPaid || batch.payments.length > 0) {
        batchStatus = 'PAID';
      } else if (hasIssues) {
        batchStatus = 'WITH_ISSUES';
      } else if (allConfirmed) {
        batchStatus = 'CONFIRMED';
      }

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
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        })),
        effectiveTotal,
        estimatedPayout: effectiveTotal * Number(batch.sellRate),
        cardsCount: batch.giftcards.length,
        confirmedCount,
        paidCount,
        hasIssues,
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
  });
