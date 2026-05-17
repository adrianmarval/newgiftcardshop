import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedData } from './seed-data';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

export async function main() {
  const { userData, countryData, brandData, brandCountryData } = seedData;
  console.log(`Iniciando el seed...`);

  // Limpiar base de datos (ordenado para evitar errores de claves foráneas)

  await prisma.payment.deleteMany();
  await prisma.giftcardIssue.deleteMany();
  await prisma.giftcard.deleteMany();
  await prisma.order.deleteMany();
  await prisma.giftcardBatch.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.userBrandCountryRate.deleteMany();
  await prisma.brandCountryRate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brandCountry.deleteMany();
  await prisma.country.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.platformSettings.deleteMany();

  // 1. Crear marcas
  await prisma.brand.createMany({
    data: brandData,
  });
  console.log('Marcas creadas.');

  // 2. Crear países
  await prisma.country.createMany({
    data: countryData,
  });
  console.log('Países creados.');

  // 3. Crear BrandCountries (relaciones marca-país con límites y rates por defecto)
  if (brandCountryData && brandCountryData.length > 0) {
    for (const bc of brandCountryData) {
      await prisma.brandCountry.create({
        data: {
          ...bc,
          rate: {
            create: {
              buyRate: 0.85,
              sellRate: 0.75,
            },
          },
        },
      });
    }
    console.log(`BrandCountries con rates creados: ${brandCountryData.length}`);
  }

  // 4. Crear usuarios (incluyendo batches y giftcards anidados)
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Usuario creado: ${user.email} (ID: ${user.id})`);
  }

  // 5. Crear platformSettings
  await prisma.platformSettings.createMany({
    data: seedData.platformSettingData,
  });
  console.log('PlatformSettings creados.');

  console.log(`Seed finalizado con éxito.`);
}

// 3. Ejecutamos main con el manejo de errores y desconexión recomendado por Prisma
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
