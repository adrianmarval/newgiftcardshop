'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { confirmPinReset, SecurityPinError } from '@/lib/services';
import { confirmPinResetInputSchema, pinMutationOutputSchema } from './schemas';

export const confirmPinResetAction = buyerActionClient
  .inputSchema(confirmPinResetInputSchema)
  .outputSchema(pinMutationOutputSchema)
  .action(async ({ parsedInput: { otp, newPin }, ctx }) => {
    try {
      await confirmPinReset(ctx.auth.user.id, otp, newPin);
      return { success: true as const };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
