'use server';

import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import {
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
  getEditableKeysByGroup,
  validateSettingValue,
  serializeSettingValue,
  type SettingGroupId,
  type SettingKey,
} from '@/lib/settings';
import { logger } from '@/lib/logger';
import { updateSettingsGroupInputSchema, updateSettingsGroupOutputSchema } from './schemas';

export const updateSettingsGroup = adminActionClient
  .inputSchema(updateSettingsGroupInputSchema)
  .outputSchema(updateSettingsGroupOutputSchema)
  .action(async ({ parsedInput: { group, values }, ctx }) => {
    const groupId = group as SettingGroupId;
    if (!(groupId in SETTING_GROUPS)) {
      throw new ActionError(`Grupo de configuración desconocido: "${group}"`);
    }

    const editableKeys = getEditableKeysByGroup(groupId);
    const allowedKeys = new Set<string>(editableKeys);

    const updates: { key: SettingKey; value: unknown }[] = [];
    for (const [key, value] of Object.entries(values)) {
      if (!allowedKeys.has(key)) {
        throw new ActionError(`Setting "${key}" no pertenece al grupo "${group}" o no es editable`);
      }
      const settingKey = key as SettingKey;
      const validation = validateSettingValue(settingKey, value);
      if (!validation.valid) {
        throw new ActionError(`Valor inválido para ${SETTING_DEFINITIONS[settingKey].label}: ${validation.error}`);
      }
      updates.push({ key: settingKey, value });
    }

    if (updates.length === 0) {
      return { success: true as const, updated: 0 };
    }

    // Leer valores anteriores para el audit log
    const existing = await prisma.platformSettings.findMany({
      where: { key: { in: updates.map((u) => u.key) } },
      select: { key: true, value: true },
    });
    const previousValues = new Map(existing.map((s) => [s.key, s.value]));

    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.platformSettings.upsert({
          where: { key },
          update: { value: serializeSettingValue(key, value) },
          create: { key, value: serializeSettingValue(key, value), description: SETTING_DEFINITIONS[key].description },
        }),
      ),
    );

    // Audit trail — una entrada por setting efectivamente modificado
    const actorId = ctx.auth.user.id;
    for (const { key, value } of updates) {
      const oldValue = previousValues.get(key) ?? null;
      const newValue = serializeSettingValue(key, value);
      if (oldValue === newValue) continue;
      logger.action('admin', 'settings-update', `Setting "${key}" actualizado`, {
        userId: actorId,
        metadata: { group: groupId, key, oldValue, newValue },
      });
    }

    return { success: true as const, updated: updates.length };
  });
