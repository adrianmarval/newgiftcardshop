'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { getLogUsersOutputSchema } from './schemas';

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