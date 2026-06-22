import prisma from '@/lib/prisma';

export async function getUserRates(userId: string, params: { brandCountryId?: string; brandId?: string; countryId?: string }) {
  let brandCountryId = params.brandCountryId;
  let brandId = params.brandId;
  let countryId = params.countryId;

  // Si brandId viene en formato compuesto (ej. "brandId|countryId"), lo separamos de forma robusta
  if (brandId && brandId.includes('|')) {
    const parts = brandId.split('|');
    brandId = parts[0];
    if (!countryId) {
      countryId = parts[1];
    }
  }

  if (!brandCountryId && brandId && countryId) {
    const bc = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: {
          brandId,
          countryId,
        },
      },
      select: { id: true },
    });
    brandCountryId = bc?.id;
  }

  if (!brandCountryId && brandId && !countryId) {
    const bc = await prisma.brandCountry.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    brandCountryId = bc?.id;
  }

  if (!brandCountryId) {
    throw new Error('Combinación de marca y país no válida.');
  }

  // 1. Buscar tasa personalizada del usuario
  const userRate = await prisma.userBrandCountryRate.findUnique({
    where: {
      userId_brandCountryId: {
        userId,
        brandCountryId,
      },
    },
  });

  if (userRate) {
    return {
      buyRate: userRate.buyRate,
      sellRate: userRate.sellRate,
      isCustom: true,
    };
  }

  throw new Error('You do not have a rate assigned for this brand and country. Contact the administrator.');
}
