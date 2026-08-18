'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { Role } from '@/generated/prisma/enums';
import { listUsersInputSchema, listUsersOutputSchema } from './schemas';

export const listUsers = adminActionClient
  .inputSchema(listUsersInputSchema)
  .outputSchema(listUsersOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { page, limit, role, search } = parsedInput;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (role && role !== 'ALL') {
        where.role = role;
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
            select: { telegramId: true, username: true, firstName: true },
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
        telegramUser: user.telegramUser ?? null,
      }));

      return {
        success: true as const,
        items: mappedItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
        },
      };
    } catch (error) {
      console.error('[listUsers]', error);
      throw new ActionError('Error al obtener los usuarios.');
    }
  });