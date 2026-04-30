'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { adminGetAdminsOutputSchema } from '@/types/domain/admin';

export const adminGetAdmins = adminActionClient.outputSchema(adminGetAdminsOutputSchema).action(async () => {
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
