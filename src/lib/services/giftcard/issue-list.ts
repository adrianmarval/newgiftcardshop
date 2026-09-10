// ─────────────────────────────────────────────────────────────────────────────
// Admin Issues List Service — Shared query + serialization for admin portal
// Pure function: usable from server actions AND route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { logger } from '@/lib/logger';
import type { AdminGiftcardIssue } from '@/types';

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  twoFactorEnabled: true,
  telegramUser: {
    select: { telegramId: true, username: true, firstName: true, photoData: true },
  },
} as const;

export interface ListAdminIssuesInput {
  page: number;
  limit: number;
  sort?: string;
  issueType: 'ALL' | 'INVALID' | 'ALREADY_USED' | 'DEACTIVATED' | 'WRONG_AMOUNT';
  sellerId?: string | null;
  buyerId?: string | null;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

function buildWhere(input: {
  issueType: 'ALL' | 'INVALID' | 'ALREADY_USED' | 'DEACTIVATED' | 'WRONG_AMOUNT';
  sellerId?: string | null;
  buyerId?: string | null;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Prisma.GiftcardIssueWhereInput {
  const where: Prisma.GiftcardIssueWhereInput = {};

  if (input.issueType && input.issueType !== 'ALL') where.issueType = input.issueType;
  if (input.sellerId) where.sellerId = input.sellerId;
  if (input.buyerId) where.reportedById = input.buyerId;

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};
    if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
    if (input.dateTo) where.createdAt.lte = new Date(input.dateTo);
  }

  if (input.search) {
    // Normalizar: trim + quitar '@' inicial (usernames de Telegram sin '@').
    const search = input.search.trim().replace(/^@+/, '');
    if (!search) return where;
    const hashedSearch = hashCode(search.toUpperCase());
    where.OR = [
      { orderId: { contains: search, mode: 'insensitive' } },
      { giftcard: { codeHash: hashedSearch } },
      { giftcard: { brandCountry: { brand: { name: { contains: search, mode: 'insensitive' } } } } },
      { reportedBy: { name: { contains: search, mode: 'insensitive' } } },
      { reportedBy: { email: { contains: search, mode: 'insensitive' } } },
      { reportedBy: { telegramUser: { username: { contains: search, mode: 'insensitive' } } } },
      { reportedBy: { telegramUser: { firstName: { contains: search, mode: 'insensitive' } } } },
      // Seller del batch de la card reportada
      { giftcard: { batch: { user: { name: { contains: search, mode: 'insensitive' } } } } },
      { giftcard: { batch: { user: { email: { contains: search, mode: 'insensitive' } } } } },
      { giftcard: { batch: { user: { telegramUser: { username: { contains: search, mode: 'insensitive' } } } } } },
      { giftcard: { batch: { user: { telegramUser: { firstName: { contains: search, mode: 'insensitive' } } } } } },
    ];
  }

  return where;
}

export async function listAdminIssues(input: ListAdminIssuesInput) {
  const page = input.page;
  const limit = input.limit;
  const skip = (page - 1) * limit;
  const where = buildWhere(input);
  const orderBy: Prisma.GiftcardIssueOrderByWithRelationInput = input.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

  const issues = await prisma.giftcardIssue.findMany({
    where,
    include: {
      giftcard: {
        include: {
          brandCountry: { include: { brand: true, country: true } },
          batch: { include: { user: { select: USER_SUMMARY_SELECT } } },
        },
      },
      order: { select: { id: true, status: true, total: true, buyRate: true } },
      reportedBy: { select: USER_SUMMARY_SELECT },
    },
    orderBy,
    skip,
    take: limit,
  });

  const totalCount = await prisma.giftcardIssue.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  // orderCount per buyer / batchCount per seller (Admin*Summary contract)
  const buyerIds = [...new Set(issues.map((i) => i.reportedById))];
  const sellerIds = [...new Set(issues.map((i) => i.giftcard.batch?.user?.id).filter((id): id is string => !!id))];

  const [orderCounts, batchCounts] = await Promise.all([
    buyerIds.length > 0
      ? prisma.order.groupBy({ by: ['userId'], where: { userId: { in: buyerIds } }, _count: { id: true } })
      : Promise.resolve([]),
    sellerIds.length > 0
      ? prisma.giftcardBatch.groupBy({ by: ['userId'], where: { userId: { in: sellerIds } }, _count: { id: true } })
      : Promise.resolve([]),
  ]);
  const orderCountMap = new Map(orderCounts.map((c) => [c.userId, c._count.id]));
  const batchCountMap = new Map(batchCounts.filter((c): c is typeof c & { userId: string } => !!c.userId).map((c) => [c.userId, c._count.id]));

  const search = input.search?.trim();
  const hashedSearch = search ? hashCode(search.toUpperCase()) : null;

  const items: AdminGiftcardIssue[] = issues.map((issue) => {
    const card = issue.giftcard;
    const { claimCode, pinCode } = decryptGiftcardCodes(card);
    const batchUser = card.batch?.user;

    const isSearchMatch = search
      ? card.codeHash === hashedSearch || card.brandCountry.brand.name.toLowerCase().includes(search.toLowerCase())
      : false;

    return {
      id: issue.id,
      issueType: issue.issueType,
      reportedAmount: issue.reportedAmount !== null ? Number(issue.reportedAmount) : null,
      hasProof: !!issue.proofImageUrl,
      createdAt: issue.createdAt.toISOString(),
      giftcard: {
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
      },
      order: {
        id: issue.order.id,
        status: issue.order.status,
        total: Number(issue.order.total),
      },
      buyer: {
        id: issue.reportedBy.id,
        name: issue.reportedBy.name,
        email: issue.reportedBy.email,
        buyRate: issue.order.buyRate.toNumber(),
        orderCount: orderCountMap.get(issue.reportedById) ?? 0,
        createdAt: issue.reportedBy.createdAt.toISOString(),
        twoFactorEnabled: issue.reportedBy.twoFactorEnabled,
        telegramUser: issue.reportedBy.telegramUser
          ? {
              telegramId: issue.reportedBy.telegramUser.telegramId,
              username: issue.reportedBy.telegramUser.username,
              firstName: issue.reportedBy.telegramUser.firstName,
              hasPhoto: !!issue.reportedBy.telegramUser.photoData,
            }
          : null,
      },
      seller: batchUser
        ? {
            id: batchUser.id,
            name: batchUser.name,
            email: batchUser.email,
            sellRate: card.batch!.sellRate.toNumber(),
            orderCount: batchCountMap.get(batchUser.id) ?? 0,
            createdAt: batchUser.createdAt.toISOString(),
            twoFactorEnabled: batchUser.twoFactorEnabled,
            telegramUser: batchUser.telegramUser
              ? {
                  telegramId: batchUser.telegramUser.telegramId,
                  username: batchUser.telegramUser.username,
                  firstName: batchUser.telegramUser.firstName,
                  hasPhoto: !!batchUser.telegramUser.photoData,
                }
              : null,
          }
        : null,
      isSearchMatch,
    };
  });

  logger.debug('listIssues', {
    flow: 'admin',
    action: 'list-issues',
    metadata: { totalCount, returned: items.length },
  });

  return {
    items,
    pagination: { currentPage: page, totalPages, totalCount },
  };
}
