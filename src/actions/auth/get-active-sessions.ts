'use server';

import { authActionClient } from '@/lib/safe-action';
import { listActiveSessions } from '@/lib/services/user/user-sessions';
import { getActiveSessionsOutputSchema } from './session-schemas';

export const getActiveSessions = authActionClient
  .outputSchema(getActiveSessionsOutputSchema)
  .action(async ({ ctx }) => {
    const sessions = await listActiveSessions(ctx.auth.user.id);
    return { success: true as const, sessions };
  });
