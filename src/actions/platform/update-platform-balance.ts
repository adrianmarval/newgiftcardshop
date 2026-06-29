'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { SETTING_KEYS } from '@/lib/settings';
import {
  updatePlatformBalanceInputSchema,
  updatePlatformBalanceOutputSchema,
} from './schemas';

export const updatePlatformBalance = adminActionClient
  .inputSchema(updatePlatformBalanceInputSchema)
  .outputSchema(updatePlatformBalanceOutputSchema)
  .action(async ({ parsedInput: { amount, type } }) => {
    await prisma.platformSettings.update({
      where: { key: SETTING_KEYS.PLATFORM_BALANCE },
      data: { balance: type === 'add' ? { increment: amount } : { decrement: amount } },
    });
    return { success: true as const };
  });