'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getUserRatesInputSchema = z.object({ userId: z.string() });

const getUserRatesOutputSchema = z.object({
  success: z.literal(true),
  rates: z.array(
    z.object({
      id: z.string(),
      brandCountryId: z.string(),
      brandName: z.string(),
      countryName: z.string(),
      countryCode: z.string(),
      buyRate: z.number(),
      sellRate: z.number(),
    }),
  ),
});

export const getUserRates = adminActionClient
  .inputSchema(getUserRatesInputSchema)
  .outputSchema(getUserRatesOutputSchema)
  .action(async ({ parsedInput }) => {
    const { userId } = parsedInput;

    const rates = await prisma.userBrandCountryRate.findMany({
      where: { userId },
      include: {
        brandCountry: {
          include: {
            brand: true,
            country: true,
          },
        },
      },
      orderBy: {
        brandCountry: {
          brand: {
            name: 'asc',
          },
        },
      },
    });

    return {
      success: true as const,
      rates: rates.map((r) => ({
        id: r.id,
        brandCountryId: r.brandCountryId,
        brandName: r.brandCountry.brand.name,
        countryName: r.brandCountry.country.name,
        countryCode: r.brandCountry.country.code,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      })),
    };
  });
