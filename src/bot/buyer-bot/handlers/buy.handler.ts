import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { Decimal } from '@prisma/client/runtime/client';
import type { BuyerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import { findGiftcardCombination } from '@/lib/browse-giftcards';
import { Prisma } from '@/generated/prisma/client';

// ── Step 1: Elegir Brand ──────────────────────────────────────────────────────

export async function startBuyWizard(ctx: BuyerContext) {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: {
      countries: {
        where: { isActive: true },
        include: {
          giftcards: { where: { inStock: true, status: 'UNUSED' }, select: { id: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Solo marcas con stock
  const brandsWithStock = brands.filter((b) => b.countries.some((c) => c.giftcards.length > 0));

  if (brandsWithStock.length === 0) {
    return ctx.reply('😔 No hay tarjetas disponibles en este momento. Intentá más tarde.');
  }

  const kb = new InlineKeyboard();
  for (const brand of brandsWithStock) {
    kb.text(`${brand.icon} ${brand.name}`, `buy_brand_${brand.id}`).row();
  }
  kb.text('❌ Cancelar', 'buy_cancel');

  ctx.session.wizard.step = 'idle';

  const msg = '🛒 <b>¿Qué marca querés comprar?</b>';
  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
    return ctx.answerCallbackQuery();
  }
  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
}

// ── Step 2: Elegir Country ────────────────────────────────────────────────────

export async function handleBuyBrandSelected(ctx: BuyerContext) {
  const brandId = ctx.callbackQuery?.data?.replace('buy_brand_', '');
  if (!brandId) return ctx.answerCallbackQuery();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      countries: {
        where: { isActive: true },
        include: {
          country: true,
          giftcards: { where: { inStock: true, status: 'UNUSED' }, select: { id: true } },
        },
      },
    },
  });

  if (!brand) return ctx.answerCallbackQuery('Marca no encontrada');

  const countriesWithStock = brand.countries.filter((c) => c.giftcards.length > 0);
  if (countriesWithStock.length === 0) {
    return ctx.answerCallbackQuery('Sin stock para esta marca');
  }

  ctx.session.wizard.brandId = brand.id;
  ctx.session.wizard.brandName = brand.name;

  const kb = new InlineKeyboard();
  for (const bc of countriesWithStock) {
    kb.text(`${bc.country.name} (${bc.giftcards.length} disponibles)`, `buy_country_${bc.country.id}`).row();
  }
  kb.text('⬅️ Volver', 'buy_start').row().text('❌ Cancelar', 'buy_cancel');

  await ctx.editMessageText(`🌍 <b>País para ${brand.icon} ${brand.name}:</b>`, { parse_mode: 'HTML', reply_markup: kb });
  return ctx.answerCallbackQuery();
}

// ── Step 3: Ingresar monto ────────────────────────────────────────────────────

export async function handleBuyCountrySelected(ctx: BuyerContext) {
  const countryId = ctx.callbackQuery?.data?.replace('buy_country_', '');
  if (!countryId) return ctx.answerCallbackQuery();

  const country = await prisma.country.findUnique({ where: { id: countryId } });
  if (!country) return ctx.answerCallbackQuery('País no encontrado');

  ctx.session.wizard.countryId = country.id;
  ctx.session.wizard.countryName = country.name;
  ctx.session.wizard.step = 'awaitingAmount';

  await ctx.editMessageText(
    `💵 <b>¿Cuánto querés gastar? (face value en USD)</b>\n\n` +
      `Marca: <b>${ctx.session.wizard.brandName} — ${country.name}</b>\n\n` +
      `Escribí el monto. Ejemplo: <code>50</code>`,
    { parse_mode: 'HTML' },
  );
  return ctx.answerCallbackQuery();
}

// ── Step 4: Buscar y previsualizar ────────────────────────────────────────────

export async function handleAmountText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingAmount') return;

  const text = (ctx.message as any)?.text?.trim() as string | undefined;
  const amount = text ? parseFloat(text) : NaN;

  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Monto inválido. Ingresá un número mayor a 0. Ejemplo: <code>50</code>', {
      parse_mode: 'HTML',
    });
  }

  const { brandId, countryId } = ctx.session.wizard;
  if (!brandId || !countryId) {
    return ctx.reply('❌ Sesión expirada. Empezá de nuevo con /buy.');
  }

  // Verificar crédito disponible
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { creditLimit: true, buyRate: true, minAmountPreference: true, maxAmountPreference: true },
  });
  if (!user) return ctx.reply('❌ Usuario no encontrado.');

  const unpaidOrders = await prisma.order.findMany({
    where: { userId: ctx.user.id, status: 'AWAITING_PAYMENT' },
    select: { adjustedTotal: true, total: true },
  });
  const unpaidTotal = unpaidOrders.reduce((s, o) => s.plus(o.adjustedTotal ?? o.total), new Decimal(0));

  const amountDec = new Decimal(amount);
  const creditCost = amountDec.mul(user.buyRate);

  if (unpaidTotal.gte(user.creditLimit)) {
    return ctx.reply(
      `⚠️ Alcanzaste tu límite de crédito de <b>${fmt$(user.creditLimit)}</b>.\n\n` +
        `Tenés <b>${fmt$(unpaidTotal)}</b> pendiente de pago. Pagá antes de continuar.`,
      { parse_mode: 'HTML' },
    );
  }

  if (unpaidTotal.plus(creditCost).gt(user.creditLimit)) {
    return ctx.reply(
      `⚠️ Esta compra (<b>${fmt$(creditCost)}</b>) excedería tu límite de crédito de <b>${fmt$(user.creditLimit)}</b>.\n\n` +
        `Ya tenés <b>${fmt$(unpaidTotal)}</b> pendiente.`,
      { parse_mode: 'HTML' },
    );
  }

  // Buscar tarjetas
  const brandCountry = await prisma.brandCountry.findUnique({
    where: { brandId_countryId: { brandId, countryId } },
  });
  if (!brandCountry) return ctx.reply('❌ Combinación de marca/país no encontrada.');

  const allCards = await prisma.giftcard.findMany({
    where: { brandCountryId: brandCountry.id, inStock: true, status: 'UNUSED' },
    include: { brandCountry: { include: { country: true } } },
  });

  const result = findGiftcardCombination(
    allCards,
    amount,
    user.minAmountPreference ? new Decimal(user.minAmountPreference) : undefined,
    user.maxAmountPreference ? new Decimal(user.maxAmountPreference) : undefined,
  );

  if (result.selectedCards.length === 0) {
    return ctx.reply(`😔 No hay tarjetas disponibles para <b>${fmt$(amount)}</b> con tus preferencias actuales.`, { parse_mode: 'HTML' });
  }

  const cards = result.selectedCards as typeof allCards;
  const totalFace = cards.reduce((s, c) => s + Number(c.amount), 0);
  const totalCost = totalFace * Number(user.buyRate);

  let msg =
    `🛒 <b>Tarjetas encontradas:</b>\n\n` +
    cards.map((c) => `• ${fmt$(c.amount)}`).join('\n') +
    `\n\n` +
    `Face value total: <b>${fmt$(totalFace)}</b>\n` +
    `Tasa de compra: ${(Number(user.buyRate) * 100).toFixed(0)}%\n` +
    `<b>Total a pagar: ${fmt$(totalCost)}</b>\n\n` +
    `¿Confirmar la orden?`;

  // Guardar IDs en sesión
  ctx.session.wizard.selectedGiftcardIds = cards.map((c) => c.id);
  ctx.session.wizard.step = 'idle';

  const kb = new InlineKeyboard().text('✅ Confirmar orden', 'buy_confirm').text('❌ Cancelar', 'buy_cancel');

  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
}

// ── Step 5: Crear orden ───────────────────────────────────────────────────────

export async function handleBuyConfirm(ctx: BuyerContext) {
  const { selectedGiftcardIds } = ctx.session.wizard;
  if (!selectedGiftcardIds || selectedGiftcardIds.length === 0) {
    await ctx.answerCallbackQuery('Sesión expirada. Empezá de nuevo con /buy');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { buyRate: true },
  });
  if (!user) return ctx.answerCallbackQuery('Usuario no encontrado');

  const giftcards = await prisma.giftcard.findMany({
    where: { id: { in: selectedGiftcardIds }, inStock: true, status: 'UNUSED' },
  });

  if (giftcards.length === 0) {
    await ctx.answerCallbackQuery('Las tarjetas ya no están disponibles');
    return ctx.editMessageText('😔 Las tarjetas ya fueron compradas por otra persona. Intentá de nuevo con /buy.');
  }

  const total = giftcards.reduce((s, c) => s.plus(c.amount.mul(user.buyRate)), new Prisma.Decimal(0));

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: ctx.user.id,
        total,
        buyRate: user.buyRate,
        status: 'PENDING',
        giftcards: { connect: giftcards.map((c) => ({ id: c.id })) },
      },
    });
    await tx.giftcard.updateMany({
      where: { id: { in: giftcards.map((c) => c.id) } },
      data: { inStock: false },
    });
    return created;
  });

  ctx.session.wizard.selectedGiftcardIds = undefined;

  const kb = new InlineKeyboard().text('📋 Ver orden', `order_detail_${order.id}`).row().text('📋 Ver Mis órdenes', 'my_orders');

  await ctx.editMessageText(
    `✅ <b>¡Orden creada!</b>\n\nID: <code>${order.id}</code>\nTotal: <b>${fmt$(total)}</b>\n\n` +
      `Aplicá las tarjetas y luego confirmá el uso desde el detalle de la orden.`,
    { parse_mode: 'HTML', reply_markup: kb },
  );
  return ctx.answerCallbackQuery('¡Orden creada!');
}

export async function handleBuyCancel(ctx: BuyerContext) {
  ctx.session.wizard.step = 'idle';
  ctx.session.wizard.selectedGiftcardIds = undefined;
  await ctx.editMessageText('❌ Compra cancelada.');
  return ctx.answerCallbackQuery();
}
