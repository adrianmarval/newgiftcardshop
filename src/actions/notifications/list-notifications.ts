'use server';

import { authActionClient } from '@/lib/safe-action';
import { listUserNotifications } from '@/lib/services/notification';
import { listNotificationsInputSchema, listNotificationsOutputSchema } from './schemas';

export const listNotifications = authActionClient
  .inputSchema(listNotificationsInputSchema)
  .outputSchema(listNotificationsOutputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const data = await listUserNotifications(ctx.auth.user.id, parsedInput);

    return {
      success: true as const,
      ...data,
    };
  });
