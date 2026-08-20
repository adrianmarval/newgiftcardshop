'use server';

import { auth } from '@/lib/auth/auth-server';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { dashboardMap, roleMap } from '@/types';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { passkeyLoginInputSchema, passkeyLoginOutputSchema } from './schemas';

/**
 * Post-passkey sign-in guard.
 *
 * `signIn.passkey` hits the auth handler directly from the client, bypassing
 * the `login` server action — so the portal/role guard MUST be re-validated
 * here, after the WebAuthn ceremony, before letting the user into the portal.
 *
 * También redirige a la vista intersticial de setup-passkey si el usuario
 * no tiene passkeys registradas y no dismissió la vista antes (cookie).
 */
export const completePasskeyLogin = actionClient
  .inputSchema(passkeyLoginInputSchema)
  .outputSchema(passkeyLoginOutputSchema)
  .action(async function ({ parsedInput: { portal } }) {
    const hdrs = await headers();
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || undefined;
    const requiredRole = roleMap[portal];

    try {
      const session = await auth.api.getSession({ headers: hdrs });

      if (!session?.user) {
        return { success: false as const, error: 'Passkey authentication failed' };
      }

      const user = session.user as { id: string; email: string; role?: string; emailVerified?: boolean | null };

      if (user.role !== requiredRole && user.role !== 'ADMIN') {
        await auth.api.signOut({ headers: hdrs });
        logger.warn('Login con passkey con rol incorrecto', {
          flow: 'auth',
          action: 'login',
          metadata: { email: user.email, portal, userRole: user.role, requiredRole },
          ip,
        });
        return { success: false as const, error: `Your account does not have ${requiredRole.toLowerCase()} access` };
      }

      if (!user.emailVerified) {
        await auth.api.signOut({ headers: hdrs });
        logger.warn('Login con passkey con email no verificado', {
          flow: 'auth',
          action: 'login',
          metadata: { email: user.email, portal },
          ip,
        });
        return {
          success: false as const,
          error: 'Your email has not been verified. Please check your inbox or resend the verification email.',
          needsVerification: true,
          email: user.email,
        };
      }

      logger.action('auth', 'login', `Login con passkey exitoso: ${user.email}`, {
        userId: user.id,
        metadata: { email: user.email, portal },
        ip,
      });

      const passkeyCount = await prisma.passkey.count({ where: { userId: user.id } });
      const redirectTo = passkeyCount === 0 ? `/${portal}/auth/setup-passkey` : dashboardMap[portal];
      return { success: true as const, redirectTo };
    } catch {
      logger.warn('Login con passkey fallido', { flow: 'auth', action: 'login', metadata: { portal }, ip });
      return { success: false as const, error: 'Login failed' };
    }
  });
