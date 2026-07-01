'use server';

import { adminActionClient } from '@/lib/safe-action';
import { createProvider } from '@/lib/ai-provider-config';
import { createAIProviderSchema } from './schemas';

export const createAIProvider = adminActionClient
  .inputSchema(createAIProviderSchema)
  .action(async ({ parsedInput }) => {
    return createProvider(parsedInput);
  });
