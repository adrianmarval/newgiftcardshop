'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { appSectionMap, portalSchema } from '@/types';

const forgotPasswordInputSchema = z.object({
  email: z.email('Invalid email address'),
  portal: portalSchema,
});

const forgotPasswordOutputSchema = z.union([z.object({ success: z.literal(true), email: z.string() }), z.object({ error: z.string() })]);

export const forgotPassword = actionClient
  .inputSchema(forgotPasswordInputSchema)
  .outputSchema(forgotPasswordOutputSchema)
  .action(async function ({ parsedInput: { email, portal } }) {
    const portalPath = appSectionMap[portal];
    const callbackURL = `${process.env.BETTER_AUTH_URL}${portalPath}/auth/reset-password`;

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
