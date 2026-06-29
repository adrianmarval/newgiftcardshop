'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getActiveCountriesOutputSchema } from './schemas';

export const getActiveCountries = authActionClient.outputSchema(getActiveCountriesOutputSchema).action(async () => {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return {
    success: true as const,
    countries: countries.map((country) => ({
      id: country.id,
      name: country.name,
      code: country.code,
      currency: country.currency ?? null,
    })),
  };
});