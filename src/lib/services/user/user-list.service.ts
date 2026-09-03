// ─────────────────────────────────────────────────────────────────────────────
// Admin Users List Service — Shared query + serialization for admin portal
// Pure function: usable from server actions AND route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { Role } from '@/generated/prisma/enums';

export interface ListAdminUsersInput {
  page: number;
  limit: number;
  role?: string;
  search?: string;
  isActive?: boolean;
}

export async function listAdminUsers(input: ListAdminUsersInput) {
  const { page, limit, role, search, isActive } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (role && role !== 'ALL') {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      telegramUser: {
        select: { telegramId: true, username: true, firstName: true, photoData: true },
      },
      paymentMethod: {
        select: {
          address: true,
          isBinanceWallet: true,
          updatedAt: true,
          coin: { select: { symbol: true, name: true } },
          network: { select: { name: true, description: true } },
        },
      },
    },
  });
  const totalCount = await prisma.user.count({ where });

  const totalPages = Math.ceil(totalCount / limit);

  const mappedItems = items.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isActive: user.isActive,
    creditLimit: Number(user.creditLimit),
    minAmountPreference: user.minAmountPreference ? Number(user.minAmountPreference) : null,
    maxAmountPreference: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
    allowSearchPreferences: user.allowSearchPreferences,
    allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    createdAt: user.createdAt,
    telegramUser: user.telegramUser
      ? { telegramId: user.telegramUser.telegramId, username: user.telegramUser.username, firstName: user.telegramUser.firstName, hasPhoto: !!user.telegramUser.photoData }
      : null,
    paymentMethod: user.paymentMethod,
  }));

  return {
    items: mappedItems,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
    },
  };
}
