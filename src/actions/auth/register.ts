'use server';

import { authApi } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { appSectionMap, roleMap } from '@/types';
import { registerInputSchema, registerOutputSchema } from './schemas';

export const register = actionClient
  .inputSchema(registerInputSchema)
  .outputSchema(registerOutputSchema)
  .action(async function ({ parsedInput: { fullName, email, password, portal } }) {
    const callbackURL = `${appSectionMap[portal]}/auth/login`;
    const role = roleMap[portal];

    try {
      await authApi.signUpEmail({
        body: {
          name: fullName,
          email,
          password,
          role,
          callbackURL,
        },
        headers: await headers(),
      });
      return { success: true as const, redirectTo: callbackURL };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        error: 'An error occurred during registration. The email may already be in use.',
      };
    }
  });