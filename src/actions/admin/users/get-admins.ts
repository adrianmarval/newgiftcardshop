'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';

export const getAdmins = adminActionClient.action(async () => {
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
