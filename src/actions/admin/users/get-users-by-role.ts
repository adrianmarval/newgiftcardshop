'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { getUsersByRoleInputSchema, getUsersByRoleOutputSchema } from './schemas';

export const getUsersByRole = adminActionClient
  .inputSchema(getUsersByRoleInputSchema)
  .outputSchema(getUsersByRoleOutputSchema)
  .action(async ({ parsedInput }) => {
    const { role } = parsedInput;
    const where: { role: typeof role; orders?: { some: Record<string, never> } } = { role };
    if (role === 'BUYER') where.orders = { some: {} };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    return { success: true as const, users };
  });