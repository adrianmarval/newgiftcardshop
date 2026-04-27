'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { logoutSchema, logoutOutputSchema } from '@/types/auth/schemas';

export const logout = actionClient
  .inputSchema(logoutSchema)
  .outputSchema(logoutOutputSchema)
  .action(async function ({ parsedInput: { portal } }) {
    const portalValue = portal ?? 'buy';
    await auth.api.signOut({ headers: await headers() });
    return { success: true, redirectTo: `/${portalValue}/auth/login` };
  });
