'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { dashboardMap, roleMap } from '@/types';
import { logger } from '@/lib/logger';
import { loginInputSchema, loginOutputSchema } from './schemas';

export const login = actionClient
  .inputSchema(loginInputSchema)
  .outputSchema(loginOutputSchema)
  .action(async function ({ parsedInput: { email, password, portal } }) {
    const callbackURL = dashboardMap[portal];
    const requiredRole = roleMap[portal];
    const isSpanish = portal === 'buy' || portal === 'admin';
    const hdrs = await headers();
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || undefined;

    try {
      const response = (await auth.api.signInEmail({
        body: { email, password, callbackURL },
        headers: await headers(),
      })) as {
        twoFactorRedirect?: boolean;
        user?: {
          id: string;
          email: string;
          emailVerified: boolean;
          name: string;
          createdAt: Date;
          updatedAt: Date;
          image?: string | null;
          role?: string;
        };
      };
      if (response.twoFactorRedirect) {
        return { success: true as const, redirectTo: `${callbackURL}` };
      }

      if (response.user) {
        const user = response.user;

        if (user.role !== requiredRole && user.role !== 'ADMIN') {
          await auth.api.signOut({ headers: await headers() });
          logger.warn('Login con rol incorrecto', {
            flow: 'auth',
            action: 'login',
            metadata: { email, portal, userRole: user.role, requiredRole },
            ip,
          });
          return { success: false as const, error: `Your account does not have ${requiredRole.toLowerCase()} access` };
        }

        logger.action('auth', 'login', `Login exitoso: ${email}`, {
          userId: user.id,
          metadata: { email, portal },
          ip,
        });
        return { success: true as const, redirectTo: callbackURL };
      }

      return { success: false as const, error: 'Invalid email or password' };
    } catch (error) {
      logger.warn('Login fallido', { flow: 'auth', action: 'login', metadata: { email, portal }, ip });

      const errorObj = error as { status?: number; message?: string; body?: { message?: string; status?: number } };
      const status = errorObj?.status || errorObj?.body?.status;
      const apiMessage = errorObj?.body?.message || errorObj?.message;

      if (
        status === 403 ||
        apiMessage?.toLowerCase().includes('not verified') ||
        apiMessage?.toLowerCase().includes('verification')
      ) {
        return {
          success: false as const,
          error: isSpanish
            ? 'Tu correo electrónico no ha sido verificado. Por favor, revisa tu bandeja de entrada o reenvía el correo de verificación.'
            : 'Your email has not been verified. Please check your inbox or resend the verification email.',
          needsVerification: true,
        };
      }

      if (apiMessage) {
        return { success: false as const, error: apiMessage };
      }
      return { success: false as const, error: isSpanish ? 'Error al iniciar sesión' : 'Login failed' };
    }
  });