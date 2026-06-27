'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { logger } from '@/lib/logger';

const purgeLogsInputSchema = z.object({
  olderThanDays: z.number().int().min(0).optional().default(30),
});

const purgeLogsOutputSchema = z.object({
  success: z.literal(true),
  deletedCount: z.number(),
});

export const purgeLogs = adminActionClient
  .inputSchema(purgeLogsInputSchema)
  .outputSchema(purgeLogsOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { olderThanDays } = parsedInput;

      const where = olderThanDays > 0
        ? { timestamp: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) } }
        : {};

      const result = await prisma.appLog.deleteMany({ where });

      logger.action('batch', 'purge-logs', `Admin purgó ${result.count} logs${olderThanDays > 0 ? ` mayores a ${olderThanDays} días` : ' (todos)'}`, {
        userId: ctx.auth.user.id,
        metadata: { deletedCount: result.count, olderThanDays },
      });

      return {
        success: true as const,
        deletedCount: result.count,
      };
    } catch (error) {
      console.error('[purgeLogs]', error);
      throw new ActionError('Error al purgar los logs.');
    }
  });
