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
  const { coinData, networkData, userData, countryData, brandData, brandCountryData } = seedData;
  console.log(`Iniciando el seed...`);

  // Limpiar base de datos (ordenado para evitar errores de claves foráneas)
  await prisma.payment.deleteMany();
  await prisma.giftcardIssue.deleteMany();
  await prisma.giftcard.deleteMany();
  await prisma.order.deleteMany();
  await prisma.giftcardBatch.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.coinNetwork.deleteMany();
  await prisma.coin.deleteMany();
  await prisma.network.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.telegramUser.deleteMany();
  await prisma.userBrandCountryRate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brandCountry.deleteMany();
  await prisma.country.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.platformSettings.deleteMany();

  // 1. Crear monedas
  const coins: Record<string, { id: string }> = {};
  for (const c of coinData) {
    const coin = await prisma.coin.create({ data: c });
    coins[coin.symbol] = coin;
  }
  console.log('Monedas creadas:', Object.keys(coins).join(', '));

  // 2. Crear redes
  const networks: Record<string, { id: string }> = {};
  for (const n of networkData) {
    const network = await prisma.network.create({ data: n });
    networks[network.name] = network;
  }
  console.log('Redes creadas:', Object.keys(networks).join(', '));

  // 3. Crear relaciones Coin-Network (USDT en todas las redes)
  const usdt = coins['USDT'];
  for (const net of Object.values(networks)) {
    await prisma.coinNetwork.create({
      data: { coinId: usdt.id, networkId: net.id },
    });
  }
  console.log('Relaciones Coin-Network creadas.');

  // 4. Crear marcas
  await prisma.brand.createMany({
    data: brandData,
  });
  console.log('Marcas creadas.');

  // 5. Crear países
  await prisma.country.createMany({
    data: countryData,
  });
  console.log('Países creados.');

  // 6. Crear BrandCountries
  if (brandCountryData && brandCountryData.length > 0) {
    for (const bc of brandCountryData) {
      await prisma.brandCountry.create({
        data: bc,
      });
    }
    console.log(`BrandCountries creados: ${brandCountryData.length}`);
  }

  // 7. Crear usuarios
  const avaxcNetwork = networks['AVAXC'];
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    // Crear payment method para cada usuario
    await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        coinId: usdt.id,
        networkId: avaxcNetwork.id,
        address: '0x0000000000000000000000000000000000000000',
        isBinanceWallet: false,
      },
    });
    console.log(`Usuario creado: ${user.email} (ID: ${user.id})`);
  }

  // 8. Crear platformSettings
  await prisma.platformSettings.createMany({
    data: seedData.platformSettingData,
  });
  console.log('PlatformSettings creados.');

  console.log(`Seed finalizado con éxito.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
