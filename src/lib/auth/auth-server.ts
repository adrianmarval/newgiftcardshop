import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor, customSession } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { render } from '@react-email/components';
import { VerifyEmailTemplate, ResetPasswordTemplate } from '@/emails';

// ── Auth client helpers ─────────────────────────────────────────────────────────
export const authApi = {
  // El body NO acepta role/isActive: esos campos son input:false y se asignan
  // server-side tras la creación (register action / bot registration).
  async signUpEmail(params: {
    body: { name: string; email: string; password: string; callbackURL?: string };
    headers?: Headers;
  }) {
    return auth.api.signUpEmail(params);
  },
  async verifyTOTP(params: { body: { code: string }; headers?: Headers }) {
    return auth.api.verifyTOTP(params);
  },
} as const;

export const auth = betterAuth({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(ResetPasswordTemplate({ url, userName: user.name }));
      resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Reset your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} password`,
        html,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const html = await render(VerifyEmailTemplate({ userName: user.name, verificationUrl: url }));
      resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Verify your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} email`,
        html,
      });
    },
  },
  user: {
    // SEGURIDAD (incidente sept 2026 — probing automatizado creó cuentas ADMIN
    // activas): `input: false` es OBLIGATORIO en campos privilegiados. Con
    // `input: true` (el default), el endpoint PÚBLICO /api/auth/sign-up/email
    // acepta role/isActive en el body y cualquiera puede auto-crearse un ADMIN
    // activo bypaseando la server action register. La doc de Better Auth lo
    // advierte explícitamente. El rol se asigna server-side post-creación
    // (register action / bot registration), NUNCA desde el cliente.
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'BUYER',
        input: false,
      },
      isActive: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },

  // Tripwire anti-escalación de privilegios: si CUALQUIER camino (sign-up,
  // script, bug futuro) crea un user con rol ADMIN, notifica al admin existente
  // (in-app + Telegram + push). Fire-and-forget: NUNCA bloquea ni rompe la
  // creación del usuario. Import dinámico para no acoplar auth-server al
  // grafo de notificaciones (bots/channels) en el module graph de cada chunk.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            if ((user as { role?: string }).role !== 'ADMIN') return;
            const { notifyAdminNewAdminDetected } = await import('@/lib/notifications');
            await notifyAdminNewAdminDetected({ id: user.id, email: user.email, name: user.name });
          } catch (error) {
            console.error('[SecurityTripwire] Error notificando nuevo user ADMIN:', error);
          }
        },
      },
    },
  },

  // ── Configuración para permitir Iframe / Cross-Domain ──────────────────────────
  advanced: {
    crossSubdomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'none', // Permite que la cookie sea leída dentro de un Iframe
      secure: true, // Requerido obligatoriamente cuando SameSite es 'none'
      httpOnly: true,
    },
  },

  plugins: [
    customSession(async ({ user, session }) => {
      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId: user.id },
        select: {
          telegramId: true,
          firstName: true,
          lastName: true,
          username: true,
          languageCode: true,
          photoData: true,
        },
      });

      // IMPORTANTE: retornar `session` también — el plugin customSession
      // reemplaza el response de getSession con EXACTAMENTE lo que el callback
      // retorna. Omitir `session` deja getSession() como { user } sin session
      // en toda la app (rompió unlockWithPasskey, que lee session.createdAt
      // para el gate de sesión fresca).
      return {
        user: {
          ...user,
          telegramUser: telegramUser ? { ...telegramUser, hasPhoto: !!telegramUser.photoData, photoData: undefined } : undefined,
        },
        session,
      };
    }),
    twoFactor({
      issuer: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop',
      skipVerificationOnEnable: false,
    }),
    passkey(),
    nextCookies(),
  ],
});
