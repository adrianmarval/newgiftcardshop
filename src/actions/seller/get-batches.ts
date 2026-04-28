'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt, hashCode } from '@/lib/encryption';
import { sellerActionClient } from '@/lib/safe-action';
import { getSellerBatchesInputSchema, getSellerBatchesOutputSchema } from '@/types/domain/seller';

export const getSellerBatches = sellerActionClient
  .inputSchema(getSellerBatchesInputSchema)
  .outputSchema(getSellerBatchesOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { page, limit, status, search, sort } = parsedInput;
    const skip = (page - 1) * limit;
    const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { createdAt: 'asc' as const };

    const where: Prisma.GiftcardBatchWhereInput = { userId: ctx.auth.user.id };

    if (search) {
      const isNumeric = !isNaN(Number(search));
      const hashedSearch = hashCode(search.trim().toUpperCase());

      where.OR = [
        ...(isNumeric ? [{ id: Number(search) }] : []),
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
        giftcards: { include: { brandCountry: { include: { brand: true, country: true } }, issues: true } },
        payments: true,
      },
      orderBy,
      skip,
      take: limit,
    });
    const totalCount = await prisma.giftcardBatch.count({ where });

    const totalPages = Math.ceil(totalCount / limit);

    const filteredBatches = batches.map((batch) => {
      const sellRate = Number(batch.sellRate);
      const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
      const paidCount = batch.giftcards.filter((g) => g.status === 'USED').length;
      const hasIssues = batch.giftcards.some((g) => g.issues.length > 0);

      const giftcards = batch.giftcards.map((card) => {
        let claimCode = card.claimCode;
        let pinCode = card.pinCode ?? null;
        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          // Legacy unencrypted data — return raw value
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
          status: card.status,
          isConfirmed: card.isConfirmed,
          reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
          orderId: card.orderId,
          batchId: card.batchId,
          provenanceImageId: card.provenanceImageId,
          brand: {
            name: card.brandCountry.brand.name,
            icon: card.brandCountry.brand.icon,
            image: card.brandCountry.brand.image,
          },
          country: {
            name: card.brandCountry.country.name,
            code: card.brandCountry.country.code,
          },
          isSearchMatch,
        };
      });
      const effectiveTotal = giftcards.reduce((sum, g) => {
        return g.status === 'WRONG_AMOUNT' ? sum + (g.reportedAmount || 0) : sum + g.amount;
      }, 0);
      const estimatedPayout = effectiveTotal * sellRate;
      return {
        id: batch.id,
        userId: batch.userId,
        sellRate,
        isPaid: batch.isPaid,
        createdAt: batch.createdAt.toISOString(),
        giftcards,
        payments: batch.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          balanceAfter: Number(payment.balanceAfter),
          status: payment.status,
          createdAt: payment.createdAt.toISOString(),
        })),
        effectiveTotal,
        estimatedPayout,
        confirmedCount,
        paidCount,
        cardsCount: batch.giftcards.length,
        hasIssues,
      };
    });

    let filteredByStatus = filteredBatches;
    if (status && status !== 'ALL') {
      filteredByStatus = filteredBatches.filter((b) => {
        if (status === 'PROCESSING') return !b.isPaid && b.confirmedCount < b.cardsCount;
        if (status === 'CONFIRMED') return !b.isPaid && b.confirmedCount === b.cardsCount && !b.hasIssues;
        if (status === 'PAID') return b.isPaid;
        if (status === 'REPORTED') return b.hasIssues;
        return true;
      });
    }

    return {
      success: true as const,
      items: filteredByStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
