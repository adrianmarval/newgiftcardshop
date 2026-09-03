'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listAppLogs } from '@/lib/services/logs';
import { listLogsInputSchema, listLogsOutputSchema } from './schemas';

export const listLogs = adminActionClient
  .inputSchema(listLogsInputSchema)
  .outputSchema(listLogsOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { items, pagination } = await listAppLogs(parsedInput);
      return { success: true as const, items, pagination };
    } catch (error) {
      console.error('[listLogs]', error);
      throw new ActionError('Error al obtener los logs.');
    }
  });
