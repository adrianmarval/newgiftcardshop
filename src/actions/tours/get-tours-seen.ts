'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getToursSeenOutputSchema } from './schemas';

export const getToursSeen = authActionClient.outputSchema(getToursSeenOutputSchema).action(async ({ ctx }) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { toursSeen: true },
  });

  const toursSeen = Array.isArray(user?.toursSeen) ? (user.toursSeen as string[]) : [];
  return { success: true as const, toursSeen };
});
