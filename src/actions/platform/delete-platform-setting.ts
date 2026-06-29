'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { SETTING_DEFINITIONS, type SettingKey } from '@/lib/settings';
import { deletePlatformSettingInputSchema, deletePlatformSettingOutputSchema } from './schemas';

export const deletePlatformSetting = adminActionClient
  .inputSchema(deletePlatformSettingInputSchema)
  .outputSchema(deletePlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key } }) => {
    const settingKey = key as SettingKey;
    const definition = SETTING_DEFINITIONS[settingKey];

    if (!definition) {
      throw new ActionError(`Setting "${key}" is not a defined configuration`);
    }

    if (definition.auditOnly) {
      throw new ActionError(`Setting "${key}" is audit-only and cannot be deleted`);
    }

    await prisma.platformSettings.delete({
      where: { key },
    });
    return { success: true as const };
  });