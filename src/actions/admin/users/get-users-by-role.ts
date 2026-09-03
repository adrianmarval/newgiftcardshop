'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { ADMIN_USERS_CACHE_TAG } from '@/lib/constants';
import { getUsersByRoleInputSchema, getUsersByRoleOutputSchema } from './schemas';

type RoleFilter = 'BUYER' | 'SELLER' | 'ADMIN';

// La lista de usuarios por rol solo alimenta los combobox de filtros del
// admin. Sin cache, CADA cambio de página/filtro re-fetcheaba TODOS los
// users del rol (roundtrip completo por paginación, estirando la ventana
// de race entre navegación y realtime refresh). Tag: invalidación inmediata
// cuando el admin muta un usuario (update-user). TTL 60s: safety net para
// altas nuevas (el registro web/bot no pasa por acciones admin).
const getCachedUsersByRole = unstable_cache(
  async (role: RoleFilter) => {
    const where: { role: RoleFilter; orders?: { some: Record<string, never> } } = { role };
    if (role === 'BUYER') where.orders = { some: {} };

    return prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  },
  [ADMIN_USERS_CACHE_TAG],
  { tags: [ADMIN_USERS_CACHE_TAG], revalidate: 60 },
);

export const getUsersByRole = adminActionClient
  .inputSchema(getUsersByRoleInputSchema)
  .outputSchema(getUsersByRoleOutputSchema)
  .action(async ({ parsedInput }) => {
    const users = await getCachedUsersByRole(parsedInput.role);
    return { success: true as const, users };
  });
