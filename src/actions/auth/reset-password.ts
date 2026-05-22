'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { appSectionMap, portalSchema } from '@/types';

const resetPasswordInputSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
    portal: portalSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const resetPasswordOutputSchema = z.union([
  z.object({ success: z.literal(true), redirectTo: z.string() }),
  z.object({ error: z.string() }),
]);

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
