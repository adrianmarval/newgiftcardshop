'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getCountryByIdInputSchema = z.object({
  id: z.string(),
});

const getCountryByIdOutputSchema = z.object({
  success: z.literal(true),
  country: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      currency: z.string().nullable(),
    })
    .nullable(),
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
