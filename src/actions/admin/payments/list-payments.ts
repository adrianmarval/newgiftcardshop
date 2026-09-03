'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listAdminPayments } from '@/lib/services/payment';
import { listPaymentsInputSchema, listPaymentsOutputSchema } from './schemas';

export const listPayments = adminActionClient
  .inputSchema(listPaymentsInputSchema)
  .outputSchema(listPaymentsOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { items, pagination } = await listAdminPayments(parsedInput);
      return { success: true as const, items, pagination };
    } catch (error) {
      console.error('[listPayments]', error);
      throw new ActionError('Error al obtener los pagos.');
    }
  });
