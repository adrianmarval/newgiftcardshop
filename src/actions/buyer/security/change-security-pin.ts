'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { changeSecurityPin, SecurityPinError } from '@/lib/services';
import { changeSecurityPinInputSchema, pinMutationOutputSchema } from './schemas';

export const changeSecurityPinAction = buyerActionClient
  .inputSchema(changeSecurityPinInputSchema)
  .outputSchema(pinMutationOutputSchema)
  .action(async ({ parsedInput: { currentPin, newPin }, ctx }) => {
    try {
      await changeSecurityPin(ctx.auth.user.id, currentPin, newPin);
      return { success: true as const };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
