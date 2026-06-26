'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { adminActionClient } from '@/lib/safe-action';

const getBuyersOutputSchema = z.object({
  success: z.literal(true),
  buyers: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});

export const getBuyers = adminActionClient.outputSchema(getBuyersOutputSchema).action(async () => {
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
