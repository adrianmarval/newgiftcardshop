'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { SETTING_DEFINITIONS, validateSettingValue, serializeSettingValue, type SettingKey } from '@/lib/settings';
import { setPlatformSettingInputSchema, setPlatformSettingOutputSchema } from './schemas';

export const setPlatformSetting = adminActionClient
  .inputSchema(setPlatformSettingInputSchema)
  .outputSchema(setPlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key, value, description } }) => {
    const settingKey = key as SettingKey;
    const definition = SETTING_DEFINITIONS[settingKey];

    if (!definition) {
      throw new ActionError(`Setting "${key}" is not a defined configuration`);
    }

    if (definition.auditOnly) {
      throw new ActionError(`Setting "${key}" is audit-only and cannot be edited`);
    }

    const validation = validateSettingValue(settingKey, value);
    if (!validation.valid) {
      throw new ActionError(`Invalid value for ${key}: ${validation.error}`);
    }

    const serialized = serializeSettingValue(settingKey, value);

    await prisma.platformSettings.upsert({
      where: { key },
      update: { value: serialized, description: description ?? definition.description },
      create: { key, value: serialized, description: description ?? definition.description },
    });

    return { success: true as const };
  });