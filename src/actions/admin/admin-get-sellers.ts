'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { adminGetSellersOutputSchema } from '@/types/domain/admin';

export const adminGetSellers = adminActionClient.outputSchema(adminGetSellersOutputSchema).action(async () => {
  const sellers = await prisma.user.findMany({
    where: {
      role: { has: 'SELLER' },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    sellers: sellers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
    })),
  };
});
