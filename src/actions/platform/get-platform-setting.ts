'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { getPlatformSettingOutputSchema } from './schemas';

export const getPlatformSetting = adminActionClient.outputSchema(getPlatformSettingOutputSchema).action(async () => {
  const settings = await prisma.platformSettings.findMany();

  return {
    success: true as const,
    settings: settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description ?? null,
      balance: s.balance?.toNumber() ?? undefined,
    })),
  };
});