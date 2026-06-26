'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const platformSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
  balance: z.number().optional(),
});

export type PlatformSetting = z.infer<typeof platformSettingSchema>;

const getPlatformSettingOutputSchema = z.object({
  success: z.literal(true),
  settings: platformSettingSchema.array(),
});

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
