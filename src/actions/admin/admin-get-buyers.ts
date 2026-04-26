'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { adminGetBuyersOutputSchema } from '@/types/domain/admin';

export const adminGetBuyers = adminActionClient.outputSchema(adminGetBuyersOutputSchema).action(async () => {
  const buyers = await prisma.user.findMany({
    where: { orders: { some: {} } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    buyers: buyers.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
    })),
  };
});
