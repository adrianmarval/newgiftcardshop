import { auth } from './auth-server';
import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import type { Role } from '@/generated/prisma/enums';
import type { Session } from '@/types';

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
