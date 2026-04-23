'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { getPlatformSettingOutputSchema, setPlatformSettingInputSchema, setPlatformSettingOutputSchema } from '@/types/platform/settings';

export const getPlatformSetting = adminActionClient.outputSchema(getPlatformSettingOutputSchema).action(async () => {
  const settings = await prisma.platformSettings.findMany();
  return {
    success: true as const,
    settings: settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description ?? null,
    })),
  };
});

export const setPlatformSetting = adminActionClient
  .inputSchema(setPlatformSettingInputSchema)
  .outputSchema(setPlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key, value, description } }) => {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
    return { success: true as const };
  });
