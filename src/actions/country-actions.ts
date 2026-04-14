'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { getCountryByIdInputSchema, getActiveCountriesOutputSchema, getCountryByIdOutputSchema } from '@/types/catalog/actions';

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

export const getCountryById = authActionClient
  .inputSchema(getCountryByIdInputSchema)
  .outputSchema(getCountryByIdOutputSchema)
  .action(async ({ parsedInput: { id } }) => {
    const country = await prisma.country.findUnique({
      where: { id },
    });
    if (!country) {
      return { success: true as const, country: null };
    }
    return {
      success: true as const,
      country: {
        id: country.id,
        name: country.name,
        code: country.code,
        currency: country.currency ?? null,
      },
    };
  });
