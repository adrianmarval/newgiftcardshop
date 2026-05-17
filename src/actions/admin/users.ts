'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';

const userSchema = z.object({
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
});

const updateUserSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  minAmountPreference: z.number().nullable().optional(),
  maxAmountPreference: z.number().nullable().optional(),
  allowSearchPreferences: z.boolean().optional(),
  allowBuyRateAdjustment: z.boolean().optional(),
});

export const updateUser = adminActionClient.inputSchema(updateUserSchema).action(async function ({ parsedInput }) {
  try {
    const {
      userId,
      role,
      isActive,
      creditLimit,
      minAmountPreference,
      maxAmountPreference,
      allowSearchPreferences,
      allowBuyRateAdjustment,
    } = parsedInput;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(creditLimit !== undefined && { creditLimit }),
        ...(minAmountPreference !== undefined && { minAmountPreference }),
        ...(maxAmountPreference !== undefined && { maxAmountPreference }),
        ...(allowSearchPreferences !== undefined && { allowSearchPreferences }),
        ...(allowBuyRateAdjustment !== undefined && { allowBuyRateAdjustment }),
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
      role: user.role as 'ADMIN' | 'SELLER' | 'BUYER',
      isActive: user.isActive,
      creditLimit: Number(user.creditLimit),
      minAmountPreference: user.minAmountPreference ? Number(user.minAmountPreference) : null,
      maxAmountPreference: user.maxAmountPreference ? Number(user.maxAmountPreference) : null,
      allowSearchPreferences: user.allowSearchPreferences,
      allowBuyRateAdjustment: user.allowBuyRateAdjustment,
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

const userBrandCountryRateSchema = z.object({
  id: z.string(),
  brandCountryId: z.string(),
  brandName: z.string(),
  countryName: z.string(),
  countryCode: z.string(),
  buyRate: z.number(),
  sellRate: z.number(),
});

export const getUserBrandCountryRates = adminActionClient
  .inputSchema(z.object({ userId: z.string() }))
  .outputSchema(z.object({ success: z.literal(true), rates: z.array(userBrandCountryRateSchema) }))
  .action(async ({ parsedInput }) => {
    const { userId } = parsedInput;

    const rates = await prisma.userBrandCountryRate.findMany({
      where: { userId },
      include: {
        brandCountry: {
          include: {
            brand: true,
            country: true,
          },
        },
      },
      orderBy: {
        brandCountry: {
          brand: {
            name: 'asc',
          },
        },
      },
    });

    return {
      success: true as const,
      rates: rates.map((r) => ({
        id: r.id,
        brandCountryId: r.brandCountryId,
        brandName: r.brandCountry.brand.name,
        countryName: r.brandCountry.country.name,
        countryCode: r.brandCountry.country.code,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      })),
    };
  });

export const updateUserBrandCountryRate = adminActionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      brandCountryId: z.string(),
      buyRate: z.number().min(0).max(1),
      sellRate: z.number().min(0).max(1),
    }),
  )
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { userId, brandCountryId, buyRate, sellRate } = parsedInput;

    await prisma.userBrandCountryRate.upsert({
      where: {
        userId_brandCountryId: {
          userId,
          brandCountryId,
        },
      },
      create: {
        userId,
        brandCountryId,
        buyRate,
        sellRate,
      },
      update: {
        buyRate,
        sellRate,
      },
    });

    return { success: true as const };
  });

export const deleteUserBrandCountryRate = adminActionClient
  .inputSchema(
    z.object({
      userId: z.string(),
      brandCountryId: z.string(),
    }),
  )
  .outputSchema(z.object({ success: z.literal(true) }))
  .action(async ({ parsedInput }) => {
    const { userId, brandCountryId } = parsedInput;

    await prisma.userBrandCountryRate.delete({
      where: {
        userId_brandCountryId: {
          userId,
          brandCountryId,
        },
      },
    });

    return { success: true as const };
  });
