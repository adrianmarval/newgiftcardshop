'use server';

import { adminActionClient } from '@/lib/safe-action';
import { getAllSettings } from '@/lib/settings/settings.service';
import { getPlatformSettingOutputSchema } from './schemas';

export const getPlatformSetting = adminActionClient.outputSchema(getPlatformSettingOutputSchema).action(async () => {
  const all = await getAllSettings();

  const values: Record<string, unknown> = {};
  for (const [key, { value }] of Object.entries(all)) {
    values[key] = value;
  }

  return { success: true as const, values };
});
