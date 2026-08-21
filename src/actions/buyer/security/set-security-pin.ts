'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { setSecurityPin, SecurityPinError } from '@/lib/services';
import { setSecurityPinInputSchema, pinMutationOutputSchema } from './schemas';

export const setSecurityPinAction = buyerActionClient
  .inputSchema(setSecurityPinInputSchema)
  .outputSchema(pinMutationOutputSchema)
  .action(async ({ parsedInput: { pin }, ctx }) => {
    try {
      await setSecurityPin(ctx.auth.user.id, pin);
      return { success: true as const };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
