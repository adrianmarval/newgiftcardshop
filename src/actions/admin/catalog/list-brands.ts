'use server';

import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const getBrandsOutputSchema = z.object({
  success: z.literal(true),
  brands: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      icon: z.string(),
      image: z.string().nullable(),
      isActive: z.boolean(),
      countries: z.array(
        z.object({
          id: z.string(),
          countryId: z.string(),
          countryName: z.string(),
          countryCode: z.string(),
          minAmount: z.number().nullable(),
          maxAmount: z.number().nullable(),
          isActive: z.boolean(),
          buyRate: z.number().nullable(),
          sellRate: z.number().nullable(),
        }),
      ),
    })
    .array(),
});

export const listBrands = adminActionClient.outputSchema(getBrandsOutputSchema).action(async () => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      countries: {
        include: {
          country: true,
          rate: true,
        },
      },
    },
  });

  return {
    success: true as const,
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      icon: brand.icon,
      image: brand.image,
      isActive: brand.isActive,
      countries: brand.countries.map((bc) => ({
        id: bc.id,
        countryId: bc.countryId,
        countryName: bc.country.name,
        countryCode: bc.country.code,
        minAmount: bc.minAmount ? Number(bc.minAmount) : null,
        maxAmount: bc.maxAmount ? Number(bc.maxAmount) : null,
        isActive: bc.isActive,
        buyRate: bc.rate ? Number(bc.rate.buyRate) : null,
        sellRate: bc.rate ? Number(bc.rate.sellRate) : null,
      })),
    })),
  };
});
