'use server';

import { authActionClient } from '@/lib/safe-action';
import { getToursSeenForUser } from '@/lib/services/tours';
import { getToursSeenOutputSchema } from './schemas';

export const getToursSeen = authActionClient.outputSchema(getToursSeenOutputSchema).action(async ({ ctx }) => {
  const toursSeen = await getToursSeenForUser(ctx.auth.user.id);

  return { success: true as const, toursSeen };
});
