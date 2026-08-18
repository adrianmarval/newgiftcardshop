'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { unlinkTelegramInputSchema, unlinkTelegramOutputSchema } from './schemas';

export const unlinkTelegram = adminActionClient
  .inputSchema(unlinkTelegramInputSchema)
  .outputSchema(unlinkTelegramOutputSchema)
  .action(async function ({ parsedInput }) {
    try {
      const { userId } = parsedInput;

      const telegramUser = await prisma.telegramUser.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!telegramUser) {
        throw new ActionError('Este usuario no tiene Telegram vinculado.');
      }

      await prisma.telegramUser.delete({ where: { userId } });

      return { success: true as const, unlinked: true };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('[unlinkTelegram]', error);
      throw new ActionError('Error al desvincular Telegram.');
    }
  });
