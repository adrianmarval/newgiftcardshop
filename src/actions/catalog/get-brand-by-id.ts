'use server';

import { authActionClient } from '@/lib/safe-action';
import { getBrandSummaryById } from '@/lib/services/catalog/catalog';
import { getBrandByIdInputSchema, getBrandByIdOutputSchema } from './schemas';

export const getBrandById = authActionClient
  .inputSchema(getBrandByIdInputSchema)
  .outputSchema(getBrandByIdOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    return {
      success: true as const,
      brand: await getBrandSummaryById(id),
    };
  });
