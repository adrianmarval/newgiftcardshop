'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listAdminUsers } from '@/lib/services/user';
import { listUsersInputSchema, listUsersOutputSchema } from './schemas';

export const listUsers = adminActionClient
  .inputSchema(listUsersInputSchema)
  .outputSchema(listUsersOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { items, pagination } = await listAdminUsers(parsedInput);
      return { success: true as const, items, pagination };
    } catch (error) {
      console.error('[listUsers]', error);
      throw new ActionError('Error al obtener los usuarios.');
    }
  });
