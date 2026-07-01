'use server';

import { adminActionClient } from '@/lib/safe-action';
import { deleteProvider } from '@/lib/ai-provider-config';
import { deleteAIProviderSchema } from './schemas';

export const deleteAIProvider = adminActionClient
  .inputSchema(deleteAIProviderSchema)
  .action(async ({ parsedInput: { id } }) => {
    await deleteProvider(id);
    return { success: true };
  });
