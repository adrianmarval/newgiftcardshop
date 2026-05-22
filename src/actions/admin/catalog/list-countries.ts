'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getCountriesOutputSchema = z.object({
  success: z.literal(true),
  countries: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    })
    .array(),
});

export const listCountries = adminActionClient.outputSchema(getCountriesOutputSchema).action(async () => {
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
    })),
  };
});
