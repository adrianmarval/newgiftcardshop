'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { requestPinReset, SecurityPinError } from '@/lib/services';
import { pinMutationOutputSchema } from './schemas';

export const requestPinResetAction = buyerActionClient
  .outputSchema(pinMutationOutputSchema)
  .action(async ({ ctx }) => {
    try {
      await requestPinReset(ctx.auth.user.id);
      return { success: true as const };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
