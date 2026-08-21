'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getSecurityStatus, SecurityPinError } from '@/lib/services';
import { getSecurityStatusOutputSchema } from './schemas';

export const getSecurityStatusAction = buyerActionClient
  .outputSchema(getSecurityStatusOutputSchema)
  .action(async ({ ctx }) => {
    try {
      const status = await getSecurityStatus(ctx.auth.user.id);
      return {
        success: true as const,
        hasPin: status.hasPin,
        hasPasskey: status.hasPasskey,
        pinLocked: status.pinLocked,
        isUnlocked: status.isUnlocked,
        unlockedUntil: status.unlockedUntil ? status.unlockedUntil.toISOString() : null,
      };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
