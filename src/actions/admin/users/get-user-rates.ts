'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { getUserRatesInputSchema, getUserRatesOutputSchema } from './schemas';

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