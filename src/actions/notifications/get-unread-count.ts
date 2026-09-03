'use server';

import { authActionClient } from '@/lib/safe-action';
import { countUnreadNotifications } from '@/lib/services/notification';
import { getUnreadCountOutputSchema } from './schemas';

export const getUnreadCount = authActionClient.outputSchema(getUnreadCountOutputSchema).action(async ({ ctx }) => {
  const count = await countUnreadNotifications(ctx.auth.user.id);

  return { success: true as const, count };
});
