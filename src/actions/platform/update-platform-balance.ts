'use server';

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { SETTING_KEYS } from '@/lib/settings';
import {
  updatePlatformBalanceInputSchema,
  updatePlatformBalanceOutputSchema,
} from './schemas';

export const updatePlatformBalance = adminActionClient
  .inputSchema(updatePlatformBalanceInputSchema)
  .outputSchema(updatePlatformBalanceOutputSchema)
  .action(async ({ parsedInput: { amount, type }, ctx }) => {
    await prisma.$transaction(async (tx) => {
      const setting = await tx.platformSettings.findUnique({
        where: { key: SETTING_KEYS.PLATFORM_BALANCE },
      });

      const currentBalance = new Decimal(setting?.balance ?? 0);

      if (type === 'subtract' && currentBalance.lessThan(amount)) {
        throw new ActionError(`Balance insuficiente. Actual: ${currentBalance}, solicitado: ${amount}`);
      }

      await tx.platformSettings.update({
        where: { key: SETTING_KEYS.PLATFORM_BALANCE },
        data: { balance: type === 'add' ? { increment: amount } : { decrement: amount } },
      });

      const newBalance = type === 'add' ? currentBalance.add(amount) : currentBalance.sub(amount);

      await tx.payment.create({
        data: {
          amount,
          direction: type === 'add' ? 'CREDIT' : 'DEBIT',
          category: type === 'add' ? 'DEPOSIT' : 'WITHDRAWAL',
          status: 'COMPLETED',
          balanceAfter: newBalance,
          notes: `Manual ${type} by admin`,
          referenceType: 'MANUAL',
        },
      });
    });

    return { success: true as const };
  });