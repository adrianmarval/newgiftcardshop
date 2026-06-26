'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
import { sellerActionClient, ActionError } from '@/lib/safe-action';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { brandSchema, countrySchema, paymentListItemSchema, paginatedOutputSchema } from '@/types';

const sellerBatchListItemSchema = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  sellRate: z.number(),
  isPaid: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  giftcards: z.array(z.object({
    id: z.string(),
    claimCode: z.string(),
    pinCode: z.string().nullable(),
    amount: z.number(),
    status: z.enum(GiftcardStatus),
    isConfirmed: z.boolean(),
    reportedAmount: z.number().nullable().optional(),
    orderId: z.string().nullable(),
    batchId: z.number().nullable().optional(),
    provenanceImageId: z.string().nullable().optional(),
    brand: brandSchema,
    country: countrySchema.nullable(),
    isSearchMatch: z.boolean().optional(),
  })),
  payments: z.array(paymentListItemSchema),
  effectiveTotal: z.number(),
  estimatedPayout: z.number(),
  cardsCount: z.number().optional(),
  confirmedCount: z.number().optional(),
  paidCount: z.number().optional(),
  hasIssues: z.boolean().optional(),
});

const getSellerBatchesInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['ALL', 'PROCESSING', 'CONFIRMED', 'PAID', 'REPORTED']).optional().default('ALL'),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

const getSellerBatchesOutputSchema = paginatedOutputSchema(z.array(sellerBatchListItemSchema));

export const listBatches = sellerActionClient
  .inputSchema(getSellerBatchesInputSchema)
  .outputSchema(getSellerBatchesOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
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
              currency: card.brandCountry.country.currency,
            },
            isSearchMatch,
          };
        });
        const effectiveTotalDecimal = computeFaceValueTotal(batch.giftcards);
        const effectiveTotal = effectiveTotalDecimal.toNumber();
        const estimatedPayout = effectiveTotalDecimal.mul(batch.sellRate).toNumber();
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
            direction: payment.direction,
            category: payment.category,
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
    } catch (error) {
      console.error('[listBatches]', error);
      throw new ActionError('Error al obtener los lotes.');
    }
  });
