'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { loginSchema, loginOutputSchema } from '@/types/auth/schemas';

const dashboardMap = {
  sell: '/sell/dashboard',
  buy: '/store/dashboard',
  admin: '/admin/dashboard',
} as const;

const roleMap = {
  sell: 'SELLER',
  buy: 'BUYER',
  admin: 'ADMIN',
} as const;

export const login = actionClient
  .inputSchema(loginSchema)
  .outputSchema(loginOutputSchema)
  .action(async function ({ parsedInput: { email, password, portal } }) {
    const callbackURL = dashboardMap[portal];
    const requiredRole = roleMap[portal];

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
        return { success: true, redirectTo: `/${portal}/auth/verify-2fa` };
      }

      if (response.user) {
        const user = response.user;

        if (user.role !== requiredRole && user.role !== 'ADMIN') {
          await auth.api.signOut({ headers: await headers() });
          return {
            error: `Your account does not have ${requiredRole.toLowerCase()} access`,
          };
        }

        return { success: true, redirectTo: callbackURL };
      }

      return { error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Unexpected error occurred. Please try again later.' };
    }
  });
