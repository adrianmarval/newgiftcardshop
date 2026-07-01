'use server';

import { adminActionClient } from '@/lib/safe-action';
import { getAllProviders } from '@/lib/ai-provider-config';

export const listAIProviders = adminActionClient.action(async () => {
  return getAllProviders();
});
