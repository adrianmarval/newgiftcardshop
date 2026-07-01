'use server';

import { adminActionClient } from '@/lib/safe-action';
import { setActiveProvider } from '@/lib/ai-provider-config';
import { setActiveAIProviderSchema } from './schemas';

export const setActiveAIProvider = adminActionClient
  .inputSchema(setActiveAIProviderSchema)
  .action(async ({ parsedInput: { id } }) => {
    return setActiveProvider(id);
  });
