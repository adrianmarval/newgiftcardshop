'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']),
  isActive: z.boolean(),
  creditLimit: z.number(),
  buyRate: z.number(),
  sellRate: z.number(),
  minAmountPreference: z.number().nullable(),
  maxAmountPreference: z.number().nullable(),
  createdAt: z.date(),
});

const updateUserSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  buyRate: z.number().optional(),
  sellRate: z.number().optional(),
  minAmountPreference: z.number().nullable().optional(),
  maxAmountPreference: z.number().nullable().optional(),
});

export const updateUser = authActionClient.inputSchema(updateUserSchema).action(async function ({ parsedInput }) {
  try {
    const { userId, role, isActive, creditLimit, buyRate, sellRate, minAmountPreference, maxAmountPreference } = parsedInput;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(creditLimit !== undefined && { creditLimit }),
        ...(buyRate !== undefined && { buyRate }),
        ...(sellRate !== undefined && { sellRate }),
        ...(minAmountPreference !== undefined && { minAmountPreference }),
        ...(maxAmountPreference !== undefined && { maxAmountPreference }),
      },
      select: { id: true },
    });

    return { success: true, userId: updated.id };
  } catch (error) {
    console.error('Update user error:', error);
    return { error: 'Failed to update user' };
  }
});

const getUsersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(''),
  role: z.enum(['ALL', 'ADMIN', 'SELLER', 'BUYER']).optional().default('ALL'),
});

const getUsersOutputSchema = paginatedOutputSchema(z.array(userSchema));

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

    const [items, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const mappedItems = items.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'SELLER' | 'BUYER',
      isActive: user.isActive,
      creditLimit: Number(user.creditLimit),
      buyRate: Number(user.buyRate),
      sellRate: Number(user.sellRate),
      minAmountPreference: user.minAmountPreference ? Number(user.minAmountPreference) : null,
      maxAmountPreference: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
      createdAt: user.createdAt,
    }));

    return {
      success: true,
      items: mappedItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
  });
