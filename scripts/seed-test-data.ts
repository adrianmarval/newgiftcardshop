/**
 * seed-test-data.ts — datos de carga para estudiar comportamiento de las
 * vistas de listas (admin orders/batches/users/payments) bajo volumen real.
 *
 * Idempotente: si ya existe el usuario centinela (test-load-seller@test.local)
 * no hace nada. Para regenerar: borrar manualmente o usar RESET_TEST_DATA=1.
 *
 * Uso: pnpm tsx --tsconfig tsconfig.json scripts/seed-test-data.ts
 */
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { encrypt, hashCode } from '../src/lib/encryption';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const SENTINEL_EMAIL = 'test-load-seller@test.local';
const EXTRA_USERS = 45;
const BATCHES = 160;
const CARDS_PER_BATCH = 3;
const ORDERS = 130;
const TEST_PASSWORD = 'Test1234.';

// Determinista con seed fijo para corridas reproducibles
let rngState = 42;
function rand() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randomCode(len: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
  return out;
}
function daysAgo(n: number, jitterHours = 20) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - randInt(0, jitterHours));
  return d;
}

async function main() {
  const sentinel = await prisma.user.findUnique({ where: { email: SENTINEL_EMAIL } });
  if (sentinel && process.env.RESET_TEST_DATA !== '1') {
    console.log('[TestData] Ya existen datos de prueba — omitido (RESET_TEST_DATA=1 para forzar).');
    return;
  }
  if (sentinel) {
    console.log('[TestData] RESET_TEST_DATA=1 — limpiando datos de prueba previos...');
    const testUsers = await prisma.user.findMany({ where: { email: { endsWith: '@test.local' } }, select: { id: true } });
    const ids = testUsers.map((u) => u.id);
    await prisma.payment.deleteMany({ where: { relatedUserId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: ids } } } });
    await prisma.payment.deleteMany({ where: { batch: { userId: { in: ids } } } });
    await prisma.giftcardIssue.deleteMany({ where: { giftcard: { ownerId: { in: ids } } } });
    await prisma.giftcard.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.giftcardBatch.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log('[TestData] Limpieza lista.');
  }

  const brandCountries = await prisma.brandCountry.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  if (brandCountries.length === 0) throw new Error('No hay BrandCountries activos — corré el seed base primero.');

  // 1. Seller y buyer de carga
  const password = await hashPassword(TEST_PASSWORD);
  const seller = await prisma.user.create({
    data: {
      name: 'Load Test Seller',
      email: SENTINEL_EMAIL,
      emailVerified: true,
      isActive: true,
      role: 'SELLER',
      accounts: { create: { accountId: 'load-seller-account', providerId: 'credential', password } },
    },
  });
  const buyer = await prisma.user.create({
    data: {
      name: 'Load Test Buyer',
      email: 'test-load-buyer@test.local',
      emailVerified: true,
      isActive: true,
      role: 'BUYER',
      creditLimit: 100000,
      accounts: { create: { accountId: 'load-buyer-account', providerId: 'credential', password } },
    },
  });
  console.log('[TestData] Seller/Buyer de carga creados.');

  // 2. Usuarios extra para la vista admin users (paginación real)
  const roles = ['BUYER', 'BUYER', 'SELLER', 'BUYER', 'SELLER'] as const;
  for (let i = 0; i < EXTRA_USERS; i++) {
    await prisma.user.create({
      data: {
        name: `Test User ${i + 1}`,
        email: `test-user-${i + 1}@test.local`,
        emailVerified: true,
        isActive: i % 7 !== 0,
        role: roles[i % roles.length],
        createdAt: daysAgo(randInt(0, 90)),
        accounts: { create: { accountId: `test-user-${i + 1}-account`, providerId: 'credential', password } },
      },
    });
  }
  console.log(`[TestData] ${EXTRA_USERS} usuarios extra creados.`);

  // 3. Batches + giftcards del seller (vista admin/seller batches)
  let totalCards = 0;
  for (let b = 0; b < BATCHES; b++) {
    const bc = brandCountries[randInt(0, brandCountries.length - 1)];
    const createdAt = daysAgo(randInt(0, 60));
    const cancelled = rand() < 0.08;
    const batch = await prisma.giftcardBatch.create({
      data: {
        userId: seller.id,
        sellRate: new Prisma.Decimal(0.8 + rand() * 0.15).toDecimalPlaces(4),
        isPaid: !cancelled && rand() < 0.5,
        cancelledAt: cancelled ? createdAt : null,
        createdAt,
      },
    });
    const cards = Array.from({ length: CARDS_PER_BATCH }, () => {
      const code = `TEST${randomCode(11)}`;
      const amount = new Prisma.Decimal(randInt(5, 200)).toDecimalPlaces(2);
      return {
        brandCountryId: bc.id,
        claimCode: encrypt(code),
        codeHash: hashCode(code),
        amount,
        ownerId: seller.id,
        batchId: batch.id,
        inStock: !cancelled,
        isConfirmed: cancelled || rand() < 0.4,
        status: cancelled ? ('DEACTIVATED' as const) : ('UNUSED' as const),
        createdAt,
      };
    });
    await prisma.giftcard.createMany({ data: cards });
    totalCards += cards.length;
  }
  console.log(`[TestData] ${BATCHES} batches con ${totalCards} giftcards creados.`);

  // 4. Órdenes del buyer con cards tomadas del stock (vista admin/buyer orders)
  const ORDER_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'] as const;
  const stockCards = await prisma.giftcard.findMany({
    where: { ownerId: seller.id, orderId: null, inStock: true },
    take: ORDERS * 2,
    select: { id: true, amount: true, brandCountryId: true },
  });
  let cursor = 0;
  let createdOrders = 0;
  for (let o = 0; o < ORDERS && cursor < stockCards.length; o++) {
    const nCards = Math.min(randInt(1, 2), stockCards.length - cursor);
    const cards = stockCards.slice(cursor, cursor + nCards);
    cursor += nCards;
    const total = cards.reduce((acc, c) => acc.add(c.amount), new Prisma.Decimal(0)).toDecimalPlaces(2);
    const status = ORDER_STATUSES[randInt(0, ORDER_STATUSES.length - 1)];
    const createdAt = daysAgo(randInt(0, 45));
    const order = await prisma.order.create({
      data: {
        userId: buyer.id,
        brandCountryId: cards[0].brandCountryId,
        total,
        buyRate: new Prisma.Decimal(0.8 + rand() * 0.15).toDecimalPlaces(4),
        status,
        idempotencyKey: `load-test-${o}-${Date.now()}`,
        createdAt,
      },
    });
    await prisma.giftcard.updateMany({
      where: { id: { in: cards.map((c) => c.id) } },
      data: {
        orderId: order.id,
        inStock: false,
        isConfirmed: status === 'COMPLETED' || status === 'CANCELLED',
        status: status === 'COMPLETED' ? 'USED' : status === 'CANCELLED' ? 'DEACTIVATED' : 'UNUSED',
      },
    });
    if (status === 'COMPLETED') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          direction: 'CREDIT',
          category: 'ORDER',
          transactionId: `TXLOAD${randomCode(9)}`,
          relatedUserId: buyer.id,
          createdAt,
        },
      });
    }
    createdOrders++;
  }
  console.log(`[TestData] ${createdOrders} órdenes creadas.`);
  console.log('[TestData] Listo. Credenciales: test-load-seller@test.local / test-load-buyer@test.local — pass:', TEST_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
