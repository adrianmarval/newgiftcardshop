'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { paginatedOutputSchema } from '@/types';
import { Role } from '@/generated/prisma/enums';

const getUsersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(''),
  role: z.enum(['ALL', 'ADMIN', 'SELLER', 'BUYER']).optional().default('ALL'),
});

const getUsersOutputSchema = paginatedOutputSchema(
  z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.enum(['ADMIN', 'SELLER', 'BUYER']),
      isActive: z.boolean(),
      creditLimit: z.number(),
      minAmountPreference: z.number().nullable(),
      maxAmountPreference: z.number().nullable(),
      allowSearchPreferences: z.boolean(),
      allowBuyRateAdjustment: z.boolean(),
      createdAt: z.date(),
    })
    .array(),
);

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;
export type GetUsersOutput = z.infer<typeof getUsersOutputSchema>;

export const listUsers = adminActionClient
  .inputSchema(getUsersInputSchema)
  .outputSchema(getUsersOutputSchema)
  .action(async ({ parsedInput }) => {
    const { page, limit, role, search } = parsedInput;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    }

    const items = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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
  });
