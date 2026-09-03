'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listAdminIssues } from '@/lib/services/giftcard';
import { listIssuesInputSchema, listIssuesOutputSchema } from './schemas';

export const listIssues = adminActionClient
  .inputSchema(listIssuesInputSchema)
  .outputSchema(listIssuesOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { items, pagination } = await listAdminIssues(parsedInput);
      return { success: true as const, items, pagination };
    } catch (error) {
      console.error('[listIssues]', error);
      throw new ActionError('Error al obtener los issues.');
    }
  });
