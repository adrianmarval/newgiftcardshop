'use server';

import { adminActionClient } from '@/lib/safe-action';
import { updateProvider } from '@/lib/ai-provider-config';
import { updateAIProviderSchema } from './schemas';

export const updateAIProvider = adminActionClient
  .inputSchema(updateAIProviderSchema)
  .action(async ({ parsedInput: { id, ...data } }) => {
    return updateProvider(id, data);
  });
