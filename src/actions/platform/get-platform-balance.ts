'use server';

import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { SETTING_KEYS } from '@/lib/settings';
import { z } from 'zod';

const getPlatformBalanceOutputSchema = z.object({ success: z.literal(true), balance: z.instanceof(Decimal) });

export const getPlatformBalance = adminActionClient.outputSchema(getPlatformBalanceOutputSchema).action(async () => {
  const platformBalance = await prisma.platformSettings.findFirst({
    where: { key: SETTING_KEYS.PLATFORM_BALANCE },
    select: { balance: true },
  });

  return {
    success: true as const,
    balance: platformBalance?.balance ?? new Decimal(0),
  };
});
