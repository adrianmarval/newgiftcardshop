import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect, unauthorized } from 'next/navigation';
import type { Role } from '@/generated/prisma/enums';
import type { Session } from '@/types/auth/session';

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

export async function authorizeOrRedirect(requiredRoles: Role[], redirectTo: string): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(redirectTo);

  const user = session as Session;
  if (!user.user.isActive && user.user.role !== 'ADMIN') {
    redirect('/pending-activation');
  }

  if (!requiredRoles.includes(user.user.role as Role)) {
    redirect(redirectTo);
  }
  return user;
}
