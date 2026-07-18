'use server';

import { auth } from '@/lib/auth/auth-server';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { forgotPasswordInputSchema, forgotPasswordOutputSchema } from './schemas';

export const forgotPassword = actionClient
  .inputSchema(forgotPasswordInputSchema)
  .outputSchema(forgotPasswordOutputSchema)
  .action(async function ({ parsedInput: { email, portal } }) {
    const callbackURL = `${process.env.BETTER_AUTH_URL}/${portal}/auth/reset-password`;

    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: callbackURL,
        },
        headers: await headers(),
      });
      return { success: true as const, email };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false as const, error: 'Failed to send password reset email' };
    }
  });