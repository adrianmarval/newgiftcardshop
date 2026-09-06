'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { updateUserInputSchema, updateUserOutputSchema } from './schemas';

export const updateUser = adminActionClient
  .inputSchema(updateUserInputSchema)
  .outputSchema(updateUserOutputSchema)
  .action(async function ({ parsedInput }) {
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

      return { success: true as const, userId: updated.id };
    } catch (error) {
      console.error('Update user error:', error);
      throw new ActionError('Failed to update user');
    }
  });