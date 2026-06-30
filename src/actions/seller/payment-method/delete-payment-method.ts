'use server';

import prisma from '@/lib/prisma';
import { sellerActionClient } from '@/lib/safe-action';
import { deletePaymentMethodOutputSchema } from './schemas';

export const deletePaymentMethod = sellerActionClient
  .outputSchema(deletePaymentMethodOutputSchema)
  .action(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    await prisma.paymentMethod.deleteMany({ where: { userId } });
    return { success: true as const };
  });
