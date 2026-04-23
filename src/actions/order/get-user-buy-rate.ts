'use server';

import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { getUserBuyRateOutputSchema } from '@/types/domain/order';

export const getUserBuyRate = buyerActionClient.outputSchema(getUserBuyRateOutputSchema).action(async ({ ctx }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { buyRate: true },
  });
  return {
    success: true as const,
    rate: dbUser?.buyRate ? dbUser.buyRate.toNumber() : 85.0,
  };
});
