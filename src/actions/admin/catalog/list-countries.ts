'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { listCountriesOutputSchema } from './schemas';

export const listCountries = adminActionClient.outputSchema(listCountriesOutputSchema).action(async () => {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return {
    success: true as const,
    countries: countries.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      currency: c.currency,
    })),
  };
});