import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedData } from "./seed-data";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

export async function main() {
  const { userData, countryData, brandData } = seedData;
  console.log(`Iniciando el seed...`);

  // Limpiar base de datos (ordenado para evitar errores de claves foráneas)

  await prisma.payment.deleteMany();
  await prisma.giftcard.deleteMany();
  await prisma.order.deleteMany();
  await prisma.giftcardBatch.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.country.deleteMany();
  await prisma.brand.deleteMany();

  // 1. Crear marcas
  await prisma.brand.createMany({
    data: brandData,
  });
  console.log("Marcas creadas.");

  // 2. Crear países
  await prisma.country.createMany({
    data: countryData,
  });
  console.log("Países creados.");

  // 3. Crear usuarios (incluyendo batches y giftcards anidados)
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Usuario creado: ${user.email} (ID: ${user.id})`);
  }

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
