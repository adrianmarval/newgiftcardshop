import { auth } from './auth-server';
import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import type { Role } from '@/generated/prisma/enums';
import type { Session } from '@/types';

const ROLE_DASHBOARD: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  SELLER: '/sell/dashboard',
  BUYER: '/store/dashboard',
};

export async function getSession(): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) unauthorized();
  return session as Session;
}

export async function authorizeActiveUser(): Promise<Session> {
  const session = await getSession();
  if (!session.user.isActive && session.user.role !== 'ADMIN') {
    redirect('/pending-activation');
  }
  return session;
}

export async function authorizeByRequiredRole(requiredRoles: Role[]): Promise<Session> {
  const session = await authorizeActiveUser();
  if (!requiredRoles.includes(session.user.role as Role)) {
    unauthorized();
  }
  return session;
}

/**
 * Guard para páginas auth PÚBLICAS (login, register, forgot/reset password).
 * Si ya hay sesión activa, redirige al dashboard del rol del usuario
 * (opción A: sesión única — nunca permite re-login ni switch de portal).
 * Usuarios inactivos van a /pending-activation (espeja authorizeActiveUser).
 *
 * NO usar en verify-2fa (la sesión aún no existe durante el desafío TOTP)
 * ni en setup-passkey (requiere sesión — causaría redirect loop).
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return;

  const user = session.user as Session['user'];
  const role = user.role as Role;
  if (!user.isActive && role !== 'ADMIN') {
    redirect('/pending-activation');
  }
  redirect(ROLE_DASHBOARD[role] ?? '/');
}
