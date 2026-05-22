'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

import { PaymentDirection, PaymentCategory, PaymentReferenceType } from '@/generated/prisma/enums';
import { paginatedOutputSchema } from '@/types';

const listPaymentsInputSchema = z.object({
  direction: z
    .enum(['ALL', 'CREDIT', 'DEBIT'] as const)
    .optional()
    .default('ALL'),
  category: z
    .enum(['ALL', 'ORDER', 'BATCH', 'DEPOSIT', 'REFUND_BUYER', 'REFUND_SELLER'] as const)
    .optional()
    .default('ALL'),
  userId: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(20),
});

const listPaymentsOutputSchema = paginatedOutputSchema(
  z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      balanceAfter: z.number(),
      direction: z.enum(PaymentDirection),
      category: z.enum(PaymentCategory),
      binanceTxId: z.string().nullable(),
      relatedUserId: z.string().nullable(),
      relatedUserName: z.string().nullable(),
      relatedUserEmail: z.string().nullable(),
      notes: z.string().nullable(),
      referenceType: z.enum(PaymentReferenceType).nullable(),
      referenceId: z.string().nullable(),
      orderId: z.string().nullable(),
      batchId: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
);

export const listPayments = adminActionClient
  .inputSchema(listPaymentsInputSchema)
  .outputSchema(listPaymentsOutputSchema)
  .action(async ({ parsedInput }) => {
    const { page, limit, direction, category, userId, dateFrom, dateTo, search } = parsedInput;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (direction && direction !== 'ALL') where.direction = direction as PaymentDirection;

    if (category && category !== 'ALL') where.category = category as PaymentCategory;

    if (userId) where.relatedUserId = userId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { binanceTxId: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        batch: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalCount = await prisma.payment.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true as const,
      items: payments.map((p) => {
        let relatedUserId: string | null = p.relatedUserId ?? null;
        let relatedUserName: string | null = null;
        let relatedUserEmail: string | null = null;
        let referenceType: 'ORDER' | 'BATCH' | 'MANUAL' | null = null;
        let referenceId: string | null = null;

        if (p.orderId && p.order) {
          relatedUserId = p.order.user.id;
          relatedUserName = p.order.user.name;
          relatedUserEmail = p.order.user.email;
          referenceType = 'ORDER';
          referenceId = p.order.id;
        } else if (p.batchId && p.batch) {
          relatedUserId = p.batch.user?.id ?? relatedUserId;
          relatedUserName = p.batch.user?.name ?? null;
          relatedUserEmail = p.batch.user?.email ?? null;
          referenceType = 'BATCH';
          referenceId = p.batch.id.toString();
        }

        return {
          id: p.id,
          amount: Number(p.amount),
          balanceAfter: Number(p.balanceAfter),
          direction: p.direction,
          category: p.category,
          binanceTxId: p.binanceTxId ?? null,
          relatedUserId,
          relatedUserName,
          relatedUserEmail,
          notes: p.notes ?? null,
          referenceType,
          referenceId,
          orderId: p.orderId ?? null,
          batchId: p.batchId ?? null,
          createdAt: p.createdAt.toISOString(),
        };
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
