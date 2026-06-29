'use server';

import { auth } from '@/lib/auth/auth-server';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { dashboardMap } from '@/types';
import { resendVerificationInputSchema, resendVerificationOutputSchema } from './schemas';

export const resendVerification = actionClient
  .inputSchema(resendVerificationInputSchema)
  .outputSchema(resendVerificationOutputSchema)
  .action(async function ({ parsedInput: { email, portal } }) {
    const callbackURL = `${dashboardMap[portal]}`;

    try {
      await auth.api.sendVerificationEmail({
        body: {
          email,
          callbackURL,
        },
        headers: await headers(),
      });

      return { success: true as const };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false as const, error: 'Failed to resend verification email.' };
    }
  });