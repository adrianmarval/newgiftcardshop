'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { forgotPasswordSchema, forgotPasswordOutputSchema } from '@/types/auth/schemas';

export const forgotPassword = actionClient
  .inputSchema(forgotPasswordSchema)
  .outputSchema(forgotPasswordOutputSchema)
  .action(async function ({ parsedInput: { email, portal } }) {
    const portalPath = portal === 'buy' ? '/buy' : `/${portal}`;
    const callbackURL = `${process.env.BETTER_AUTH_URL}${portalPath}/auth/reset-password`;

    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: callbackURL,
        },
        headers: await headers(),
      });

      return { success: true, email };
    } catch (error) {
      console.error('Forgot password error:', error);
      // Always return success to prevent email enumeration
      return { success: true, email };
    }
  });
