'use server';

import { auth } from '@/lib/auth/auth-server';
import { headers } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { logoutInputSchema, logoutOutputSchema } from './schemas';

export const logout = actionClient
  .inputSchema(logoutInputSchema)
  .outputSchema(logoutOutputSchema)
  .action(async function ({ parsedInput: { portal } }) {
    await auth.api.signOut({ headers: await headers() });
    return { success: true as const, redirectTo: `/${portal}/auth/login` };
  });