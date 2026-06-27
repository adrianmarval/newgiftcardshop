'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { adminActionClient } from '@/lib/safe-action';

const getLogUsersOutputSchema = z.object({
  success: z.literal(true),
  users: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
});

export const getLogUsers = adminActionClient.outputSchema(getLogUsersOutputSchema).action(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
  };
});
