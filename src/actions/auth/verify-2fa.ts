'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { verify2FASchema, verify2FAOutputSchema } from '@/types/auth/schemas';

const dashboardMap = {
  sell: '/sell/dashboard',
  buy: '/store/dashboard',
  admin: '/admin/dashboard',
} as const;

export const verify2FA = actionClient
  .inputSchema(verify2FASchema)
  .outputSchema(verify2FAOutputSchema)
  .action(async function ({ parsedInput: { code, portal } }) {
    try {
      await auth.api.verifyTOTP({
        body: {
          code,
        },
        headers: await headers(),
      });
      return { success: true, redirectTo: dashboardMap[portal] };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { error: 'Invalid verification code' };
    }
  });
