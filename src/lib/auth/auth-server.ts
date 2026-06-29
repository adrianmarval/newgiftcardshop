import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor, customSession } from 'better-auth/plugins';
import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { render } from '@react-email/components';
import { VerifyEmailTemplate, ResetPasswordTemplate } from '@/components/emails/';

// ── Auth client helpers ─────────────────────────────────────────────────────────
// Typed wrappers for better-auth API calls that need custom typing

export const authApi = {
  async signUpEmail(params: {
    body: { name: string; email: string; password: string; role: string; isActive?: boolean; callbackURL?: string };
    headers?: Headers;
  }) {
    return auth.api.signUpEmail(params);
  },
  async verifyTOTP(params: { body: { code: string }; headers?: Headers }) {
    return auth.api.verifyTOTP(params);
  },
} as const;

export const auth = betterAuth({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop', // Added appName
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
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'BUYER',
        input: true,
      },
      isActive: {
        type: 'boolean',
        defaultValue: false,
        input: true,
      },
    },
  },
  plugins: [
    customSession(async ({ user }) => {
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

      return {
        user: {
          ...user,
          telegramUser: telegramUser ? { ...telegramUser, hasPhoto: !!telegramUser.photoData, photoData: undefined } : undefined,
        },
      };
    }),
    twoFactor({
      issuer: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop',
      skipVerificationOnEnable: false,
    }),
    nextCookies(),
  ],
});
