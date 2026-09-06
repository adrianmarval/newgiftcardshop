// ─────────────────────────────────────────────────────────────────────────────
// Admin Payments List Service — Shared query + serialization for admin portal
// Pure function: usable from server actions AND route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import type { PaymentDirection, PaymentCategory } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';

export interface ListAdminPaymentsInput {
  page: number;
  limit: number;
  direction?: string;
  category?: string;
  userId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}

export async function listAdminPayments(input: ListAdminPaymentsInput) {
  const { page, limit, direction, category, userId, dateFrom, dateTo, search } = input;
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
    // Normalizar: trim + quitar '@' inicial (usernames de Telegram sin '@').
    const term = search.trim().replace(/^@+/, '');
    if (term) {
      // El usuario relacionado se alcanza via order.user o batch.user
      // (relatedUserId es scalar sin relación en el schema).
      const userWhere = {
        name: { contains: term, mode: 'insensitive' as const },
        email: { contains: term, mode: 'insensitive' as const },
        telegramUser: {
          username: { contains: term, mode: 'insensitive' as const },
          firstName: { contains: term, mode: 'insensitive' as const },
        },
      };
      where.OR = [
        { id: { contains: term, mode: 'insensitive' } },
        { transactionId: { contains: term, mode: 'insensitive' } },
        { binanceTxId: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { order: { user: { name: userWhere.name } } },
        { order: { user: { email: userWhere.email } } },
        { order: { user: { telegramUser: { username: userWhere.telegramUser.username } } } },
        { order: { user: { telegramUser: { firstName: userWhere.telegramUser.firstName } } } },
        { batch: { user: { name: userWhere.name } } },
        { batch: { user: { email: userWhere.email } } },
        { batch: { user: { telegramUser: { username: userWhere.telegramUser.username } } } },
        { batch: { user: { telegramUser: { firstName: userWhere.telegramUser.firstName } } } },
      ];
    }
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
        status: p.status,
        binanceTxId: p.binanceTxId ?? null,
        isBinanceWallet: p.isBinanceWallet,
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
}
