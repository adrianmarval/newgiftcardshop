'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

export const adminGetSellers = adminActionClient
  .outputSchema(
    z.object({
      success: z.literal(true),
      sellers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
        }),
      ),
    }),
  )
  .action(async () => {
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
