// ─────────────────────────────────────────────────────────────────────────────
// Admin User Search Service — búsqueda server-side para los combobox de
// usuarios del admin (batches/orders/issues/payments + refund dialog).
//
// Reemplaza a getUsersByRole (que cargaba TODOS los usuarios del rol en cada
// page load — no escala). Acá el filtro vive en la DB con take acotado.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import { Role } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';

export interface SearchAdminUsersInput {
  /** Rol a filtrar; omitir/'ALL' = todos los roles. */
  role?: 'SELLER' | 'BUYER' | 'ADMIN' | 'ALL';
  /** Texto libre: name, email, telegram username o firstName. */
  query?: string;
  /** Lookup exacto por id (resolver el label de un valor ya seleccionado). */
  id?: string;
}

export interface AdminUserSearchResult {
  id: string;
  name: string;
  email: string;
  role: Role;
  telegramUsername: string | null;
}

const TAKE = 20;

export async function searchAdminUsers(input: SearchAdminUsersInput): Promise<{ users: AdminUserSearchResult[] }> {
  const where: Prisma.UserWhereInput = {};

  if (input.id) {
    where.id = input.id;
  } else {
    if (input.role && input.role !== 'ALL') where.role = input.role;

    // Normalizar: trim + quitar '@' inicial (usernames de Telegram sin '@').
    const term = input.query?.trim().replace(/^@+/, '');
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { telegramUser: { username: { contains: term, mode: 'insensitive' } } },
        { telegramUser: { firstName: { contains: term, mode: 'insensitive' } } },
      ];
    }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telegramUser: { select: { username: true } },
    },
    orderBy: { name: 'asc' },
    take: TAKE,
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      telegramUsername: u.telegramUser?.username ?? null,
    })),
  };
}
