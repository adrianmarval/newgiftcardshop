'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { getSellerRateOutputSchema } from '@/types/domain/seller';

export const getSellerRate = sellerActionClient.outputSchema(getSellerRateOutputSchema).action(async ({ ctx }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { sellRate: true },
  });
  return {
    success: true as const,
    rate: dbUser?.sellRate ? dbUser.sellRate.toNumber() : 0.75,
  };
});
