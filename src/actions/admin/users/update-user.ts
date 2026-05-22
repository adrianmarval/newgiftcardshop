'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const updateUserInputSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  minAmountPreference: z.number().nullable().optional(),
  maxAmountPreference: z.number().nullable().optional(),
  allowSearchPreferences: z.boolean().optional(),
  allowBuyRateAdjustment: z.boolean().optional(),
});

export const updateUser = adminActionClient.inputSchema(updateUserInputSchema).action(async function ({ parsedInput }) {
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
