'use server';

import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { verifyPinAndUnlock, SecurityPinError } from '@/lib/services';
import { unlockWithPinInputSchema, unlockOutputSchema } from './schemas';

export const unlockWithPin = buyerActionClient
  .inputSchema(unlockWithPinInputSchema)
  .outputSchema(unlockOutputSchema)
  .action(async ({ parsedInput: { pin }, ctx }) => {
    try {
      const until = await verifyPinAndUnlock(ctx.auth.user.id, pin);
      return { success: true as const, unlockedUntil: until.toISOString() };
    } catch (error) {
      if (error instanceof SecurityPinError) throw new ActionError(error.message);
      throw error;
    }
  });
