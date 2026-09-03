import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from './auth-server';
import type { Role } from '@/generated/prisma/enums';
import type { Session } from '@/types';

/**
 * Route guard para route handlers de LECTURA (/api/query/*).
 *
 * Espejo de los action clients de safe-action.ts (que NO se pueden importar
 * en route handlers: next-safe-action/adapter-better-auth importa
 * `next/navigation.js` con sufijo, cuyo grafo resuelve a un vendored
 * app-router-context inexistente en el app-route module — MODULE_UNPARSABLE).
 *
 * Semántica idéntica a los action clients:
 * - requireApiAuth(): cualquier sesión válida; inactivos (no-ADMIN) fuera.
 * - requireApiRole([...]): idem + rol en la lista.
 * - unauthorized() de las actions → acá ApiAuthError con status 401/403 JSON.
 *
 * Server-only: importar DIRECTO del archivo (nunca via barrel — rompería
 * Client Components que importen del barrel de lib/auth).
 */

export class ApiAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

async function getApiSession(): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new ApiAuthError(401, 'No autenticado');
  const user = session.user as Session['user'];
  if (!user.isActive && user.role !== 'ADMIN') throw new ApiAuthError(401, 'Cuenta inactiva');
  return session as Session;
}

export async function requireApiAuth(): Promise<Session> {
  return getApiSession();
}

export async function requireApiRole(roles: Role[]): Promise<Session> {
  const session = await getApiSession();
  if (!roles.includes(session.user.role as Role)) throw new ApiAuthError(403, 'Sin permisos');
  return session;
}

type QueryContext = { session: Session };

/**
 * Wrapper de handler GET con guard de rol. `roles = null` equivale a
 * authActionClient (cualquier sesión activa).
 */
export function withRole(
  roles: Role[] | null,
  handler: (request: Request, ctx: QueryContext) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const session = roles ? await requireApiRole(roles) : await requireApiAuth();
      return await handler(request, { session });
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}
