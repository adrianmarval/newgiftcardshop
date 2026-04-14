'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { resetPasswordSchema, resetPasswordOutputSchema } from '@/types/auth/actions';

export const resetPassword = actionClient
  .inputSchema(resetPasswordSchema)
  .outputSchema(resetPasswordOutputSchema)
  .action(async function ({ parsedInput: { token, newPassword, portal } }) {
    const portalPath = portal === 'buy' ? '/buy' : `/${portal}`;
    const loginPath = `${portalPath}/auth/login?reset=success`;

    try {
      await auth.api.resetPassword({
        body: { token, newPassword },
        headers: await headers(),
      });
      return { success: true, redirectTo: loginPath };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: 'Failed to reset password. The link may have expired.' };
    }
  });
