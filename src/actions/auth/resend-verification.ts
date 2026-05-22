'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { dashboardMap, portalSchema } from '@/types';

const resendVerificationInputSchema = z.object({
  email: z.email('Invalid email address'),
  portal: portalSchema,
});

const resendVerificationOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

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
