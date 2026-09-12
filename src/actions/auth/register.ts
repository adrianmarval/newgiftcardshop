'use server';

import { authApi } from '@/lib/auth/auth-server';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { dashboardMap, roleMap } from '@/types';
import prisma from '@/lib/prisma';
import { registerInputSchema, registerOutputSchema } from './schemas';

export const register = actionClient
  .inputSchema(registerInputSchema)
  .outputSchema(registerOutputSchema)
  .action(async function ({ parsedInput: { fullName, email, password, portal } }) {
    const callbackURL = dashboardMap[portal];
    const verifyEmailUrl = `/${portal}/auth/verify-email`;

    try {
      // El rol NUNCA viaja en el body del sign-up: role/isActive son
      // additionalFields con input:false (ver auth-server.ts). Se crea con el
      // default (BUYER, inactivo) y el rol se asigna server-side aquí.
      const result = await authApi.signUpEmail({
        body: {
          name: fullName,
          email,
          password,
          callbackURL,
        },
        headers: await headers(),
      });

      const role = roleMap[portal];
      if (role !== 'BUYER') {
        const userId = (result as { user?: { id?: string } } | null)?.user?.id;
        if (!userId) throw new Error('signUpEmail no retornó user.id');
        await prisma.user.update({ where: { id: userId }, data: { role } });
      }

      return { success: true as const, redirectTo: verifyEmailUrl };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        error: 'An error occurred during registration. The email may already be in use.',
      };
    }
  });