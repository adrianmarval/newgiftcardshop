import prisma from '@/lib/prisma';

export async function getUserRates(
  userId: string,
  params: { brandCountryId?: string; brandId?: string; countryId?: string }
) {
  let brandCountryId = params.brandCountryId;

  if (!brandCountryId && params.brandId && params.countryId) {
    const bc = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: {
          brandId: params.brandId,
          countryId: params.countryId,
        },
      },
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

  // 2. Buscar tasa global de fallback
  const globalRate = await prisma.brandCountryRate.findUnique({
    where: {
      brandCountryId,
    },
  });

  if (globalRate) {
    return {
      buyRate: globalRate.buyRate,
      sellRate: globalRate.sellRate,
      isCustom: false,
    };
  }

  // 3. Error si no está configurada la tasa
  throw new Error('No se han configurado tarifas para esta marca y país.');
}
