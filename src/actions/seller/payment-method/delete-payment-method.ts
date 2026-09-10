'use server';

import { sellerActionClient } from '@/lib/safe-action';
import { deletePaymentMethodOutputSchema } from './schemas';
import { deleteWallet } from '@/lib/services/payment/wallet';

export const deletePaymentMethod = sellerActionClient
  .outputSchema(deletePaymentMethodOutputSchema)
  .action(async ({ ctx }) => {
    await deleteWallet(ctx.auth.user.id);
    return { success: true as const };
  });
