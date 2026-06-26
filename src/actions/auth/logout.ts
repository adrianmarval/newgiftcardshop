'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { appSectionMap, portalSchema } from '@/types';

const logoutInputSchema = z.object({
  portal: portalSchema,
});

const logoutOutputSchema = z.object({
  success: z.literal(true),
  redirectTo: z.string(),
});

export const logout = actionClient
  .inputSchema(logoutInputSchema)
  .outputSchema(logoutOutputSchema)
  .action(async function ({ parsedInput: { portal } }) {
    const appSection = appSectionMap[portal];
    await auth.api.signOut({ headers: await headers() });
    return { success: true as const, redirectTo: `${appSection}/auth/login` };
  });
