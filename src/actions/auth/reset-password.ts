'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { appSectionMap } from '@/types';
import { resetPasswordInputSchema, resetPasswordOutputSchema } from './schemas';

export const resetPassword = actionClient
  .inputSchema(resetPasswordInputSchema)
  .outputSchema(resetPasswordOutputSchema)
  .action(async function ({ parsedInput: { token, newPassword, portal } }) {
    const portalPath = appSectionMap[portal];
    const loginPath = `${portalPath}/auth/login?reset=success`;

    try {
      await auth.api.resetPassword({
        body: { token, newPassword },
        headers: await headers(),
      });
      return { success: true as const, redirectTo: loginPath };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false as const, error: 'Failed to reset password' };
    }
  });