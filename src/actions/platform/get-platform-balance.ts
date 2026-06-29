'use server';

import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { SETTING_KEYS } from '@/lib/settings';
import { getPlatformBalanceOutputSchema } from './schemas';

export const getPlatformBalance = adminActionClient
  .outputSchema(getPlatformBalanceOutputSchema)
  .action(async () => {
    try {
      const platformBalance = await prisma.platformSettings.findFirst({
        where: { key: SETTING_KEYS.PLATFORM_BALANCE },
        select: { balance: true },
      });

      return {
        success: true as const,
        balance: Number(platformBalance?.balance ?? 0),
      };
    } catch (error) {
      console.error('[getPlatformBalance]', error);
      throw new ActionError('Error al obtener el balance de la plataforma.');
    }
  });