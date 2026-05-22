'use server';

import { z } from 'zod';
import { actionClient } from '@/lib/safe-action';
import { authApi } from '@/lib/auth';
import { headers } from 'next/headers';
import { dashboardMap, portalSchema } from '@/types/';

const verify2FAInputSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  backupCode: z.string().optional(),
  portal: portalSchema,
});

const verify2FAOutputSchema = z.union([z.object({ success: z.literal(true), redirectTo: z.string() }), z.object({ error: z.string() })]);

export const verify2FA = actionClient
  .inputSchema(verify2FAInputSchema)
  .outputSchema(verify2FAOutputSchema)
  .action(async function ({ parsedInput: { code, portal } }) {
    try {
      await authApi.verifyTOTP({
        body: {
          code,
        },
        headers: await headers(),
      });
      return { success: true as const, redirectTo: dashboardMap[portal] };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false as const, error: 'Invalid verification code' };
    }
  });
