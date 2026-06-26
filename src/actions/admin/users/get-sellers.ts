'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { adminActionClient } from '@/lib/safe-action';

const getSellersOutputSchema = z.object({
  success: z.literal(true),
  sellers: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});

export const getSellers = adminActionClient.outputSchema(getSellersOutputSchema).action(async () => {
  const sellers = await prisma.user.findMany({
    where: {
      role: 'SELLER',
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
