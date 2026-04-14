'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { actionClient } from '@/lib/safe-action';
import { resendVerificationSchema, resendVerificationOutputSchema } from '@/types/auth/schemas';

export const resendVerification = actionClient
  .inputSchema(resendVerificationSchema)
  .outputSchema(resendVerificationOutputSchema)
  .action(async function ({ parsedInput: { email, portal } }) {
    const portalPath = portal === 'buy' ? '/buy' : `/${portal}`;
    const callbackURL = `${process.env.BETTER_AUTH_URL}${portalPath}/auth/verify-email`;

    try {
      // Find the user to get their name
      const user = await prisma.user.findUnique({
        where: { email },
        select: { name: true },
      });

      // Use better-auth to send a new verification email
      await auth.api.sendVerificationEmail({
        body: {
          email,
          callbackURL,
        },
        headers: await headers(),
      });

      return { success: true };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { error: 'Failed to resend verification email.' };
    }
  });
