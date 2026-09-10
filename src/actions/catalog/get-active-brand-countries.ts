'use server';

import { authActionClient } from '@/lib/safe-action';
import { getActiveBrandCountriesWithStock } from '@/lib/services/catalog/catalog';
import { getActiveBrandCountriesOutputSchema } from './schemas';

export const getActiveBrandCountries = authActionClient
  .outputSchema(getActiveBrandCountriesOutputSchema)
  .action(async () => {
    return {
      success: true as const,
      brandCountries: await getActiveBrandCountriesWithStock(),
    };
  });
