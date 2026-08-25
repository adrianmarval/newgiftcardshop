/**
 * Script de Migración Completo: giftcardshop-reseller-panel → newgiftcardshop
 *
 * Uso:
 *   OLD_DATABASE_URL="postgresql://..." NEW_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-full.ts
 *
 * Pre-requisitos:
 *   1. Campo legacyId agregado al schema User (prisma db push)
 *   2. Seed del nuevo sistema corrido (Coins, Networks, Brands, Countries, BrandCountries)
 *   3. Variables de entorno OLD_DATABASE_URL y NEW_DATABASE_URL configuradas
 *
 * Nota: Se usa SQL raw para la DB vieja porque el schema es completamente
 * diferente al del nuevo sistema. Prisma solo se usa para la DB nueva.
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { encrypt, decrypt } from '../src/lib/encryption';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import 'dotenv/config';

// ── Configuración ──────────────────────────────────────────────────────────────

const OLD_DB_URL = process.env.OLD_DATABASE_URL;
const NEW_DB_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;
const OLD_ENCRYPTION_KEY = process.env.GIFTCARD_ENCRYPTION_KEY;

if (!OLD_DB_URL || !NEW_DB_URL) {
  console.error('❌ OLD_DATABASE_URL y NEW_DATABASE_URL (o DATABASE_URL) son requeridos');
  process.exit(1);
}

if (!OLD_ENCRYPTION_KEY) {
  console.error('❌ GIFTCARD_ENCRYPTION_KEY es requerida (del sistema viejo)');
  process.exit(1);
}

// Old DB: SQL raw via pg
const oldPool = new Pool({ connectionString: OLD_DB_URL });

// New DB: Prisma
const newPool = new Pool({ connectionString: NEW_DB_URL });
const newDb = new PrismaClient({ adapter: new PrismaPg(newPool) });

// ── Helpers de cifrado ─────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * Descifra con el formato viejo: hex(iv):hex(authTag):hex(encrypted)
 * usando GIFTCARD_ENCRYPTION_KEY
 */
function decryptOld(ciphertext: string): string {
  const key = Buffer.from(OLD_ENCRYPTION_KEY!, 'hex');
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error(`Formato viejo inválido: esperado 3 partes, recibido ${parts.length}`);
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedData, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Re-cifra: descifra con key vieja, cifra con key nueva (formato v1:base64)
 * Si ya está en formato nuevo (v1:...), lo retorna tal cual.
 */
function reEncrypt(oldCiphertext: string): string {
  // Si ya está en formato nuevo (v1:...), no hacer nada
  if (oldCiphertext.startsWith('v1:')) {
    return oldCiphertext;
  }

  // Si está en formato legacy de 3 partes hex, descifrar y re-cifrar
  const parts = oldCiphertext.split(':');
  if (parts.length === 3) {
    const plaintext = decryptOld(oldCiphertext);
    return encrypt(plaintext);
  }

  // Si no es ningún formato conocido, probablemente es texto plano
  // (no debería pasar, pero por si acaso)
  console.warn(`Formato de ciphertext desconocido: ${oldCiphertext.substring(0, 30)}...`);
  return encrypt(oldCiphertext);
}

// ── Tipos para filas de la DB vieja ────────────────────────────────────────────

interface OldReseller {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  isTwoFactorEnabled: boolean;
  balance: string;
  role: string;
}

interface OldUser {
  id: string;
  telegramId: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  isEnabled: boolean;
  creditLimit: string;
  role: string;
  sellerPercentage: string;
  buyerPercentage: string;
}

interface OldPaymentMethod {
  id: string;
  method: string | null;
  coin: string | null;
  network: string | null;
  address: string;
  isBinanceWallet: boolean;
  userId: string | null;
  resellerId: string | null;
}

interface OldGiftcardBatch {
  id: string;
  isPaid: boolean;
  discountApplied: string;
  sellerId: string;
}

interface OldGiftcard {
  id: string;
  code: string;
  codeHash: string;
  denomination: string;
  inStock: boolean;
  isConfirmed: boolean;
  reportedDenomination: string | null;
  status: string;
  batchId: string;
  sellerId: string;
}

interface OldOrder {
  id: string;
  total: string;
  isPaid: boolean;
  status: string;
  buyerId: string;
  discountApplied: string;
}

interface OldOrderItem {
  id: string;
  giftcardId: string;
  orderId: string;
}

interface OldGiftcardIssue {
  id: string;
  giftcardId: string;
  issueType: string;
}

// ── Mapeos globales (viejoId → nuevoId) ────────────────────────────────────────

const userMap = new Map<string, string>();       // old User/Reseller id → new User id
const telegramToUserMap = new Map<string, string>(); // old telegramId → old User.id (para lookup rápido)
const batchMap = new Map<string, number>();      // old Batch id (cuid) → new Batch id (int)
const orderMap = new Map<string, string>();      // old Order id → new Order id
const giftcardMap = new Map<string, string>();   // old Giftcard id → new Giftcard id

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(section: string, msg: string) {
  console.log(`[${section}] ${msg}`);
}

function warn(section: string, msg: string) {
  console.warn(`⚠️  [${section}] ${msg}`);
}

// ── Fase 0: Catálogos ──────────────────────────────────────────────────────────

let amazonUsBrandCountryId: string;

async function seedCatalogs() {
  log('CATALOGS', 'Verificando catálogos...');

  const brand = await newDb.brand.upsert({
    where: { slug: 'amazon' },
    update: {},
    create: { slug: 'amazon', name: 'Amazon', icon: '📦', isActive: true },
  });

  const country = await newDb.country.upsert({
    where: { code: 'US' },
    update: {},
    create: { code: 'US', name: 'United States', currency: 'USD' },
  });

  const bc = await newDb.brandCountry.upsert({
    where: { brandId_countryId: { brandId: brand.id, countryId: country.id } },
    update: {},
    create: { brandId: brand.id, countryId: country.id, isActive: true },
  });
  amazonUsBrandCountryId = bc.id;

  const coin = await newDb.coin.findUnique({ where: { symbol: 'USDT' } });
  if (!coin) throw new Error('Coin USDT no existe. Correr seed primero.');

  log('CATALOGS', `✅ BrandCountry "Amazon/US": ${bc.id}`);
}

// ── Fase 1: Migrar Users ───────────────────────────────────────────────────────

async function migrateReseller() {
  log('RESELLER', 'Migrando Reseller → User (ADMIN)...');

  const { rows } = await oldPool.query<OldReseller>(
    `SELECT id, name, email, "emailVerified", "isTwoFactorEnabled", balance, role FROM "Reseller"`
  );
  log('RESELLER', `Encontrados ${rows.length} resellers`);

  for (const r of rows) {
    const newUser = await newDb.user.create({
      data: {
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified !== null,
        role: 'ADMIN',
        isActive: true,
        twoFactorEnabled: r.isTwoFactorEnabled,
        creditLimit: 200,
        legacyId: r.id,
      },
    });

    userMap.set(r.id, newUser.id);
    log('RESELLER', `  ✅ ${r.name} (${r.email}) → ${newUser.id}`);
  }
}

async function migrateTelegramUsers() {
  log('TELEGRAM', 'Migrando Users (telegram) → User + TelegramUser...');

  const { rows } = await oldPool.query<OldUser>(
    `SELECT id, "telegramId", "first_name", "last_name", "username", "isEnabled", "creditLimit", role, "sellerPercentage", "buyerPercentage" FROM "User"`
  );
  log('TELEGRAM', `Encontrados ${rows.length} users de telegram`);

  for (const u of rows) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Sin nombre';
    const email = `tg_${u.telegramId}@legacy.migrated`;
    const role = u.role === 'SELLER' ? 'SELLER' : 'BUYER';

    const newUser = await newDb.user.create({
      data: {
        name,
        email,
        emailVerified: false,
        role,
        isActive: u.isEnabled,
        creditLimit: parseFloat(u.creditLimit) || 200,
        legacyId: u.id,
      },
    });

    userMap.set(u.id, newUser.id);
    telegramToUserMap.set(u.telegramId, u.id);

    await newDb.telegramUser.create({
      data: {
        telegramId: u.telegramId,
        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        userId: newUser.id,
      },
    });

    log('TELEGRAM', `  ✅ ${name} (tg:${u.telegramId}) → ${newUser.id}`);
  }
}

// ── Fase 1.5: Migrar Tasas (UserBrandCountryRate) ─────────────────────────────

async function migrateUserRates() {
  log('RATES', 'Migrando tasas → UserBrandCountryRate...');

  // Solo telegram users (SELLER / BUYER) — el Reseller no tiene tasas
  const { rows: userRows } = await oldPool.query<OldUser>(
    `SELECT id, "sellerPercentage", "buyerPercentage", role FROM "User"`
  );

  let count = 0;
  for (const u of userRows) {
    const newUserId = userMap.get(u.id);
    if (!newUserId) continue;

    const sellRate = 1 - parseFloat(u.sellerPercentage) / 100;
    const buyRate = 1 - parseFloat(u.buyerPercentage) / 100;

    await newDb.userBrandCountryRate.create({
      data: {
        userId: newUserId,
        brandCountryId: amazonUsBrandCountryId,
        sellRate,
        buyRate,
      },
    });

    count++;
    log('RATES', `  ✅ User ${newUserId} (${u.role}): sellRate=${sellRate}, buyRate=${buyRate}`);
  }

  log('RATES', `✅ ${count} tasas migradas`);
}

// ── Fase 2: Migrar PaymentMethods ──────────────────────────────────────────────

const COIN_MAP: Record<string, string> = { USDT: 'USDT', LTC: 'LTC' };
const NETWORK_MAP: Record<string, string> = {
  BSC: 'BSC', TRX: 'TRX', MATIC: 'MATIC', AVAXC: 'AVAXC', PLASMA: 'PLASMA', LTC: 'LTC',
};

async function migratePaymentMethods() {
  log('PAYMENT_METHODS', 'Migrando PaymentMethods...');

  const { rows } = await oldPool.query<OldPaymentMethod>(
    `SELECT id, method, coin, network, address, "isBinanceWallet", "userId", "resellerId" FROM "PaymentMethod"`
  );
  log('PAYMENT_METHODS', `Encontrados ${rows.length} payment methods`);

  for (const pm of rows) {
    const coinSymbol = pm.coin ? COIN_MAP[pm.coin] : 'USDT';
    const coin = await newDb.coin.findUnique({ where: { symbol: coinSymbol } });
    if (!coin) {
      warn('PAYMENT_METHODS', `  Coin "${coinSymbol}" no encontrado, saltando PM ${pm.id}`);
      continue;
    }

    const networkName = pm.network ? NETWORK_MAP[pm.network] : 'TRX';
    const network = await newDb.network.findUnique({ where: { name: networkName } });
    if (!network) {
      warn('PAYMENT_METHODS', `  Network "${networkName}" no encontrado, saltando PM ${pm.id}`);
      continue;
    }

    // Resolver user
    let newUserId: string | undefined;
    if (pm.resellerId) {
      newUserId = userMap.get(pm.resellerId);
    } else if (pm.userId) {
      const oldUserId = telegramToUserMap.get(pm.userId);
      if (oldUserId) newUserId = userMap.get(oldUserId);
    }

    if (!newUserId) {
      warn('PAYMENT_METHODS', `  User no encontrado para PM ${pm.id}, saltando...`);
      continue;
    }

    const existing = await newDb.paymentMethod.findUnique({ where: { userId: newUserId } });
    if (existing) {
      log('PAYMENT_METHODS', `  User ${newUserId} ya tiene PM, saltando...`);
      continue;
    }

    await newDb.paymentMethod.create({
      data: {
        address: pm.address,
        isBinanceWallet: pm.isBinanceWallet,
        coinId: coin.id,
        networkId: network.id,
        userId: newUserId,
      },
    });

    log('PAYMENT_METHODS', `  ✅ PM para ${newUserId} (${coinSymbol}/${networkName})`);
  }
}

// ── Fase 3: Migrar GiftcardBatch ───────────────────────────────────────────────

async function migrateBatches() {
  log('BATCHES', 'Migrando GiftcardBatch...');

  const { rows } = await oldPool.query<OldGiftcardBatch>(
    `SELECT id, "isPaid", "discountApplied", "sellerId" FROM "GiftcardBatch"`
  );
  log('BATCHES', `Encontrados ${rows.length} batches`);

  for (const b of rows) {
    const newUserId = userMap.get(b.sellerId);
    if (!newUserId) {
      warn('BATCHES', `  Seller ${b.sellerId} no encontrado, saltando batch ${b.id}`);
      continue;
    }

    const newBatch = await newDb.giftcardBatch.create({
      data: {
        sellRate: 1 - parseFloat(b.discountApplied) / 100,
        isPaid: b.isPaid,
        userId: newUserId,
      },
    });

    batchMap.set(b.id, newBatch.id);
    log('BATCHES', `  ✅ Batch ${b.id} → ${newBatch.id} (seller: ${newUserId})`);
  }
}

// ── Fase 4: Migrar Giftcards ──────────────────────────────────────────────────

const GIFTCARD_STATUS_MAP: Record<string, string> = {
  APPLIED: 'USED', UNUSED: 'UNUSED', DEACTIVATED: 'DEACTIVATED',
  INVALID_CODE: 'INVALID', WRONG_AMOUNT: 'WRONG_AMOUNT', ALREADY_USED: 'ALREADY_USED',
};

async function migrateGiftcards() {
  log('GIFTCARDS', 'Migrando Giftcards...');

  const { rows } = await oldPool.query<OldGiftcard>(
    `SELECT id, code, "codeHash", denomination, "inStock", "isConfirmed", "reportedDenomination", status, "batchId", "sellerId" FROM "Giftcard"`
  );
  log('GIFTCARDS', `Encontradas ${rows.length} giftcards`);

  for (const g of rows) {
    const newBatchId = batchMap.get(g.batchId);
    if (newBatchId === undefined) {
      warn('GIFTCARDS', `  Batch ${g.batchId} no encontrado, saltando giftcard ${g.id}`);
      continue;
    }

    // Giftcard.sellerId en el viejo referencia User.telegramId (no UUID)
    const oldUserId = telegramToUserMap.get(g.sellerId);
    const newOwnerId = oldUserId ? userMap.get(oldUserId) : undefined;
    if (!newOwnerId) {
      warn('GIFTCARDS', `  Seller (telegram:${g.sellerId}) no encontrado, saltando giftcard ${g.id}`);
      continue;
    }

    const status = GIFTCARD_STATUS_MAP[g.status] || 'UNUSED';

    // Saltar si codeHash ya existe (unique constraint en el nuevo sistema)
    const existingGc = await newDb.giftcard.findUnique({ where: { codeHash: g.codeHash } });
    if (existingGc) {
      warn('GIFTCARDS', `  codeHash duplicado, saltando ${g.code} (${g.codeHash})`);
      continue;
    }

    const newGiftcard = await newDb.giftcard.create({
      data: {
        brandCountryId: amazonUsBrandCountryId,
        claimCode: reEncrypt(g.code),
        codeHash: g.codeHash,
        amount: parseFloat(g.denomination),
        inStock: g.inStock,
        isConfirmed: g.isConfirmed,
        status: status as any,
        reportedAmount: g.reportedDenomination ? parseFloat(g.reportedDenomination) : null,
        ownerId: newOwnerId,
        batchId: newBatchId,
        escalationTier: 85,
      },
    });

    giftcardMap.set(g.id, newGiftcard.id);
    log('GIFTCARDS', `  ✅ ${g.code} → ${newGiftcard.id}`);
  }
}

// ── Fase 5: Migrar Orders ─────────────────────────────────────────────────────

const ORDER_STATUS_MAP: Record<string, string> = {
  IN_PROGRESS: 'PENDING', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED',
};

async function migrateOrders() {
  log('ORDERS', 'Migrando Orders...');

  const { rows } = await oldPool.query<OldOrder>(
    `SELECT id, total, "isPaid", status, "buyerId", "discountApplied" FROM "Order"`
  );
  log('ORDERS', `Encontradas ${rows.length} órdenes`);

  for (const o of rows) {
    const newUserId = userMap.get(o.buyerId);
    if (!newUserId) {
      warn('ORDERS', `  Buyer ${o.buyerId} no encontrado, saltando order ${o.id}`);
      continue;
    }

    let status = ORDER_STATUS_MAP[o.status] || 'PENDING';
    if (o.isPaid && status !== 'COMPLETED') {
      status = 'COMPLETED';
    }

    const newOrder = await newDb.order.create({
      data: {
        total: parseFloat(o.total),
        buyRate: 1 - parseFloat(o.discountApplied) / 100,
        status: status as any,
        userId: newUserId,
        brandCountryId: amazonUsBrandCountryId,
      },
    });

    orderMap.set(o.id, newOrder.id);
    log('ORDERS', `  ✅ Order ${o.id} → ${newOrder.id} (buyer: ${newUserId})`);
  }
}

// ── Fase 6: Vincular Giftcards a Orders ────────────────────────────────────────

async function linkGiftcardsToOrders() {
  log('LINK_GC_ORDER', 'Vinculando Giftcards a Orders via OrderItem...');

  const { rows } = await oldPool.query<OldOrderItem>(
    `SELECT id, "giftcardId", "orderId" FROM "OrderItem"`
  );
  log('LINK_GC_ORDER', `Encontrados ${rows.length} order items`);

  let linked = 0;
  for (const oi of rows) {
    const newGiftcardId = giftcardMap.get(oi.giftcardId);
    const newOrderId = orderMap.get(oi.orderId);

    if (!newGiftcardId || !newOrderId) {
      warn('LINK_GC_ORDER', `  No se pudo vincular: gc=${oi.giftcardId} order=${oi.orderId}`);
      continue;
    }

    await newDb.giftcard.update({
      where: { id: newGiftcardId },
      data: { orderId: newOrderId },
    });

    linked++;
  }

  log('LINK_GC_ORDER', `✅ ${linked} giftcards vinculadas a orders`);
}

// ── Fase 7: Migrar GiftcardIssues ─────────────────────────────────────────────

const ISSUE_TYPE_MAP: Record<string, string> = {
  DEACTIVATED_ISSUE: 'DEACTIVATED', INVALID_CODE_ISSUE: 'INVALID',
  WRONG_AMOUNT_ISSUE: 'WRONG_AMOUNT', ALREADY_USED_ISSUE: 'ALREADY_USED',
};

async function migrateIssues() {
  log('ISSUES', 'Migrando GiftcardIssues...');

  const { rows } = await oldPool.query<OldGiftcardIssue>(
    `SELECT id, "giftcardId", "issueType" FROM "GiftcardIssue"`
  );
  log('ISSUES', `Encontrados ${rows.length} issues`);

  for (const i of rows) {
    const newGiftcardId = giftcardMap.get(i.giftcardId);
    if (!newGiftcardId) {
      warn('ISSUES', `  Giftcard ${i.giftcardId} no encontrada, saltando issue ${i.id}`);
      continue;
    }

    const gc = await newDb.giftcard.findUnique({ where: { id: newGiftcardId } });
    if (!gc) {
      warn('ISSUES', `  Giftcard nueva ${newGiftcardId} no encontrada, saltando`);
      continue;
    }

    const issueType = ISSUE_TYPE_MAP[i.issueType] || 'INVALID';

    // Solo crear si tiene orderId (sino la giftcard no tiene orden vinculada)
    if (!gc.orderId) {
      warn('ISSUES', `  Giftcard ${newGiftcardId} sin orderId, saltando issue`);
      continue;
    }

    await newDb.giftcardIssue.create({
      data: {
        issueType: issueType as any,
        giftcardId: newGiftcardId,
        orderId: gc.orderId,
        reportedById: gc.ownerId || '',
        sellerId: gc.ownerId,
      },
    });

    log('ISSUES', `  ✅ Issue ${i.id} (${i.issueType}) → giftcard ${newGiftcardId}`);
  }
}

// ── Fase 9: Post-migración ────────────────────────────────────────────────────

async function postMigration() {
  log('POST', 'Ejecutando tareas post-migración...');

  // 1. PlatformSettings.platformBalance
  const { rows: resellerRows } = await oldPool.query<OldReseller>(
    `SELECT balance FROM "Reseller" LIMIT 1`
  );
  if (resellerRows.length > 0) {
    const balance = parseFloat(resellerRows[0].balance) || 0;
    await newDb.platformSettings.upsert({
      where: { key: 'platformBalance' },
      update: { balance, value: String(balance) },
      create: {
        key: 'platformBalance',
        balance,
        value: String(balance),
        description: 'Saldo disponible en la plataforma (auditoría)',
      },
    });
    log('POST', `✅ PlatformSettings.platformBalance = ${balance}`);
  }

  // 2. Verificar integridad
  log('POST', '--- Verificación de integridad ---');

  const counts = {
    users: await newDb.user.count(),
    telegramUsers: await newDb.telegramUser.count(),
    paymentMethods: await newDb.paymentMethod.count(),
    batches: await newDb.giftcardBatch.count(),
    giftcards: await newDb.giftcard.count(),
    orders: await newDb.order.count(),
    issues: await newDb.giftcardIssue.count(),
  };

  log('POST', `Users: ${counts.users}`);
  log('POST', `  TelegramUsers: ${counts.telegramUsers}`);
  log('POST', `  PaymentMethods: ${counts.paymentMethods}`);
  log('POST', `Batches: ${counts.batches}`);
  log('POST', `Giftcards: ${counts.giftcards}`);
  log('POST', `Orders: ${counts.orders}`);
  log('POST', `Issues: ${counts.issues}`);

  // 3. Verificar emails únicos
  const usersWithEmail = await newDb.user.findMany({
    where: { email: { not: { contains: '@legacy.migrated' } } },
    select: { email: true },
  });
  const emailSet = new Set(usersWithEmail.map((u) => u.email));
  if (emailSet.size !== usersWithEmail.length) {
    warn('POST', '⚠️  Hay emails duplicados en usuarios reales!');
  } else {
    log('POST', `✅ ${emailSet.size} emails únicos (no legacy)`);
  }

  // 4. Verificar legacyIds
  const usersWithLegacy = await newDb.user.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true, email: true },
  });
  log('POST', `✅ ${usersWithLegacy.length} usuarios migrados con legacyId`);

  log('POST', '✅ Verificación completada');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 === INICIO DE MIGRACIÓN COMPLETA ===\n');

  try {
    await seedCatalogs();
    console.log('');

    await migrateReseller();
    console.log('');

    await migrateTelegramUsers();
    console.log('');

    await migrateUserRates();
    console.log('');

    await migratePaymentMethods();
    console.log('');

    await migrateBatches();
    console.log('');

    await migrateGiftcards();
    console.log('');

    await migrateOrders();
    console.log('');

    await linkGiftcardsToOrders();
    console.log('');

    await migrateIssues();
    console.log('');

    await postMigration();

    console.log('\n🎉 === MIGRACIÓN COMPLETADA EXITOSAMENTE ===');
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error);
    throw error;
  } finally {
    await oldPool.end();
    await newDb.$disconnect();
    await newPool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
