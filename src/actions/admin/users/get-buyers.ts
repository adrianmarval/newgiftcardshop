'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

export const getBuyers = adminActionClient.action(async () => {
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
