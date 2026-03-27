import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { seedData } from "./seed-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

export async function main() {
  const { userData, countryData } = seedData;
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

  // Crear usuarios
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Usuario creado: ${user.email} (ID: ${user.id})`);
  }

  // Crear países
  await prisma.country.createMany({
    data: countryData,
  });

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
