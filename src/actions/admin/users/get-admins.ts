'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { adminActionClient } from '@/lib/safe-action';

const getAdminsOutputSchema = z.object({
  success: z.literal(true),
  admins: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});

export const getAdmins = adminActionClient.outputSchema(getAdminsOutputSchema).action(async () => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    admins: admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
    })),
  };
});
