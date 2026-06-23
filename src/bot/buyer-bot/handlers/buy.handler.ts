import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { Decimal } from '@prisma/client/runtime/client';
import { decrypt } from '@/lib/encryption';
import type { BuyerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import { findGiftcardCombination } from '@/lib/browse-giftcards';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import { Prisma } from '@/generated/prisma/client';
import { getUserRates } from '@/services/pricing.service';
import { formatCurrency } from '@/lib/currency-formatter';
import { GiftcardEscalationService } from '@/lib/services/giftcard-escalation';
import { estimateTimeToAccess, getEscalationConfig } from '@/lib/services/tier-estimation.service';
import { reserveGiftcards, GiftcardReservationError } from '@/lib/services/giftcard-reservation.service';

// ── Step 1: Elegir Brand ──────────────────────────────────────────────────────

export async function startBuyWizard(ctx: BuyerContext) {
  await deleteUserInput(ctx);
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
    return renderUI(ctx, '😔 No hay tarjetas disponibles en este momento. Intentá más tarde.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver', 'start'),
    });
  }

  const kb = new InlineKeyboard();
  for (const brand of brandsWithStock) {
    kb.text(`${brand.icon} ${brand.name}`, `buy_brand_${brand.id}`).row();
  }
  kb.text('❌ Cancelar', 'buy_cancel');

  ctx.session.wizard.step = 'idle';

  const msg = '🛒 <b>¿Qué marca querés comprar?</b>';
  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
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
          giftcards: { where: { inStock: true, status: 'UNUSED' }, select: { amount: true } },
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
    const totalAmount = bc.giftcards.reduce((sum, gc) => sum + Number(gc.amount), 0);
    const currency = bc.country.currency || 'USD';
    const formatted = formatCurrency(totalAmount, { currency, minimumFractionDigits: 0 });
    kb.text(`${bc.country.name} (${formatted} disponibles)`, `buy_country_${bc.country.id}`).row();
  }
  kb.text('⬅️ Volver', 'buy_start').row().text('❌ Cancelar', 'buy_cancel');

  await renderUI(ctx, `🌍 <b>País para ${brand.icon} ${brand.name}:</b>`, { parse_mode: 'HTML', reply_markup: kb });
}

// ── Step 3: Ingresar monto ────────────────────────────────────────────────────

export async function handleBuyCountrySelected(ctx: BuyerContext) {
  const countryId = ctx.callbackQuery?.data?.replace('buy_country_', '');
  if (!countryId) return ctx.answerCallbackQuery();

  const country = await prisma.country.findUnique({ where: { id: countryId } });
  if (!country) return ctx.answerCallbackQuery('País no encontrado');

  const { brandId } = ctx.session.wizard;
  if (!brandId) return ctx.answerCallbackQuery('Sesión expirada. Empezá de nuevo con /buy');

  try {
    await getUserRates(ctx.user.id, { brandId, countryId });
  } catch {
    return ctx.answerCallbackQuery('No tenés tarifa para comprar aquí. Contactá al admin.');
  }

  ctx.session.wizard.countryId = country.id;
  ctx.session.wizard.countryName = country.name;
  ctx.session.wizard.countryCurrency = country.currency || 'USD';
  ctx.session.wizard.step = 'awaitingAmount';

  await renderUI(
    ctx,
    `💵 <b>¿Qué monto de tarjetas querés? (${ctx.session.wizard.countryCurrency})</b>\n\n` +
      `Marca: <b>${escapeHTML(ctx.session.wizard.brandName ?? '')} — ${escapeHTML(country.name)}</b>\n\n` +
      `Escribí el monto. Ejemplo: <code>50</code>`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('⬅️ Volver', `buy_brand_${ctx.session.wizard.brandId}`)
        .row()
        .text('❌ Cancelar', 'buy_cancel'),
    },
  );
}

// ── Step 4: Buscar y previsualizar ────────────────────────────────────────────

export async function handleAmountText(ctx: BuyerContext) {
  if (ctx.session.wizard.step !== 'awaitingAmount') return;

  const text = (ctx.message as any)?.text?.trim() as string | undefined;
  await deleteUserInput(ctx);

  const amount = text ? parseFloat(text) : NaN;

  if (isNaN(amount) || amount <= 0) {
    return renderUI(ctx, '❌ Monto inválido. Ingresá un número mayor a 0. Ejemplo: <code>50</code>', {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('⬅️ Volver', `buy_country_${ctx.session.wizard.countryId}`),
    });
  }

  const { brandId, countryId } = ctx.session.wizard;
  if (!brandId || !countryId) {
    return renderUI(ctx, '❌ Sesión expirada. Empezá de nuevo con /buy.', {
      reply_markup: new InlineKeyboard().text('🏠 Inicio', 'start'),
    });
  }

  // Verificar crédito disponible
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { creditLimit: true, minAmountPreference: true, maxAmountPreference: true },
  });
  if (!user) return renderUI(ctx, '❌ Usuario no encontrado.');

  let buyRate: Decimal;
  try {
    const rates = await getUserRates(ctx.user.id, { brandId, countryId });
    buyRate = rates.buyRate as Decimal;
  } catch (error: any) {
    return renderUI(
      ctx,
      `❌ ${error.message || 'You do not have a rate assigned for this brand and country. Contact the administrator.'}`,
      {
        reply_markup: new InlineKeyboard().text('🏠 Volver', 'start'),
      },
    );
  }

  const unpaidOrders = await prisma.order.findMany({
    where: {
      userId: ctx.user.id,
      status: { in: ['PENDING', 'AWAITING_PAYMENT'] },
    },
    select: { adjustedTotal: true, total: true, status: true },
  });
  const unpaidTotal = unpaidOrders.reduce((s, o) => s.plus(o.adjustedTotal ?? o.total), new Decimal(0));
  const pendingCount = unpaidOrders.filter((o) => o.status === 'PENDING').length;
  const hasPendingOrders = pendingCount > 0;

  const amountDec = new Decimal(amount);
  const creditCost = amountDec.mul(buyRate);

  // Siempre verificar límite de crédito
  if (unpaidTotal.gte(user.creditLimit)) {
    return renderUI(
      ctx,
      ` <b>Límite de crédito alcanzado</b>\n\n` +
        `Tu límite: <b>${fmt$(user.creditLimit)}</b>\n` +
        `Ya tienes: <b>${fmt$(unpaidTotal)}</b> en pagos pendientes.\n\n` +
        `Debes completar los pagos antes de comprar más tarjetas.`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('🏠 Volver', 'start') },
    );
  }

  if (unpaidTotal.plus(creditCost).gt(user.creditLimit)) {
    const availableCredit = user.creditLimit.minus(unpaidTotal);
    const unpaidText = unpaidTotal.gt(0) ? `Ya tienes: <b>${fmt$(unpaidTotal)}</b> en pagos pendientes.\n` : '';
    const pendingMsg = hasPendingOrders
      ? `\nTenés <b>${pendingCount}</b> orden(es) pendientes que deben ser procesadas para liberar crédito.`
      : '';
    return renderUI(
      ctx,
      ` <b>Crédito insuficiente</b>\n\n` +
        `Tu límite: <b>${fmt$(user.creditLimit)}</b>\n` +
        unpaidText +
        `Disponible: <b>${fmt$(availableCredit)}</b>\n` +
        `Esta compra: <b>${fmt$(creditCost)}</b>\n\n` +
        `Intentá con un monto igual o menor a <b>${fmt$(availableCredit)}</b>.${pendingMsg}`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('⬅️ Cambiar Monto', `buy_country_${countryId}`) },
    );
  }

  // Buscar tarjetas
  const brandCountry = await prisma.brandCountry.findUnique({
    where: { brandId_countryId: { brandId, countryId } },
  });
  if (!brandCountry)
    return renderUI(ctx, '❌ Combinación de marca/país no encontrada.', {
      reply_markup: new InlineKeyboard().text('⬅️ Volver', 'buy_start'),
    });

  const allCards = await prisma.giftcard.findMany({
    where: { brandCountryId: brandCountry.id, inStock: true, status: 'UNUSED' },
    include: { brandCountry: { include: { country: true } } },
  });

  const result = findGiftcardCombination(
    allCards,
    amount,
    Math.floor(Number(buyRate) * 100),
    user.minAmountPreference ? new Decimal(user.minAmountPreference) : undefined,
    user.maxAmountPreference ? new Decimal(user.maxAmountPreference) : undefined,
  );

  if (result.selectedCards.length === 0) {
    const buyerRatePercent = Math.floor(Number(buyRate) * 100);
    const accessibleAmount = result.tierInfo.accessibleAmount;
    const inaccessibleAmount = result.tierInfo.inaccessibleAmount;
    const accessibleCards = result.tierInfo.accessibleCards.length;
    const inaccessibleCardsCount = result.tierInfo.inaccessibleCards.length;

    let msg = '';

    const currency = ctx.session.wizard.countryCurrency || 'USD';
    if (inaccessibleAmount.gt(0) && accessibleAmount.eq(0)) {
      const escalationConfig = await getEscalationConfig();
      const estimation = estimateTimeToAccess(
        result.tierInfo.inaccessibleCards as typeof allCards,
        buyerRatePercent,
        escalationConfig,
      );

      const estimationPart = estimation
        ? `\n⏱️ La próxima estará disponible en <b>~${estimation.minMinutes} min</b> (tier ${estimation.nextCardTier}% → ${buyerRatePercent}%).`
        : '';

      msg = `😔 No hay tarjetas para tu tasa del <b>${buyerRatePercent}%</b>.\n\n` +
        `📦 Stock con tier superior: <b>${fmt$(Number(inaccessibleAmount), currency)}</b> en ${inaccessibleCardsCount} tarjetas.${estimationPart}`;
    } else if (inaccessibleAmount.gt(0) && accessibleAmount.gt(0)) {
      const escalationConfig = await getEscalationConfig();
      const estimation = estimateTimeToAccess(
        result.tierInfo.inaccessibleCards as typeof allCards,
        buyerRatePercent,
        escalationConfig,
      );

      const estimationPart = estimation
        ? `\n⏱️ Más tarjetas en ~${estimation.minMinutes} min (tier ${estimation.nextCardTier}% → ${buyerRatePercent}%).`
        : '';

      msg = `😔 Podés tomar ${accessibleCards} tarjetas (${fmt$(Number(accessibleAmount), currency)}), pero no alcanza los ${fmt$(amount, currency)} buscados.\n\n` +
        `📦 Stock no accesible: <b>${fmt$(Number(inaccessibleAmount), currency)}</b> en ${inaccessibleCardsCount} tarjetas.${estimationPart}`;
    } else {
      msg = `😔 Podés tomar ${accessibleCards} tarjetas (${fmt$(Number(accessibleAmount), currency)}).\n\nEl total no alcanza lo que buscás. Probá con un monto menor.`;
    }

    const kb = new InlineKeyboard()
      .text('⬅️ Cambiar Monto', `buy_country_${countryId}`)
      .row()
      .text('🔄 Reintentar', `buy_country_${countryId}`);

    return renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
  }

  const cards = result.selectedCards as typeof allCards;
  const totalFace = cards.reduce((s, c) => s + Number(c.amount), 0);
  const totalCost = totalFace * Number(buyRate);
  const currency = ctx.session.wizard.countryCurrency || 'USD';

  const ratePercent = (Number(buyRate) * 100).toFixed(0);
  const cardsList = cards.map((c) => `• ${fmt$(c.amount, currency)}`).join('\n');

  let msg =
    `🛒 <b>Tarjetas encontradas al ${ratePercent}%:</b>\n\n` +
    cardsList +
    `\n\n` +
    `Face value total: <b>${fmt$(totalFace, currency)}</b>\n` +
    `<b>Total a pagar: ${fmt$(totalCost, 'USD')}</b>\n\n` +
    `¿Confirmar la orden?`;

  // Guardar IDs en sesión
  ctx.session.wizard.selectedGiftcardIds = cards.map((c) => c.id);
  ctx.session.wizard.step = 'idle';

  const kb = new InlineKeyboard().text('✅ Confirmar orden', 'buy_confirm').text('❌ Cancelar', 'buy_cancel');

  return renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}
// ── Step 5: Crear orden ───────────────────────────────────────────────────────
export async function handleBuyConfirm(ctx: BuyerContext) {
  const { selectedGiftcardIds } = ctx.session.wizard;
  if (!selectedGiftcardIds || selectedGiftcardIds.length === 0) {
    await ctx.answerCallbackQuery('No hay tarjetas seleccionadas.');
    return;
  }
  const { brandId, countryId } = ctx.session.wizard;
  if (!brandId || !countryId) {
    await ctx.answerCallbackQuery('Sesión expirada. Empezá de nuevo con /buy');
    return;
  }

  let buyRate: Prisma.Decimal;
  try {
    const rates = await getUserRates(ctx.user.id, { brandId, countryId });
    buyRate = rates.buyRate as Prisma.Decimal;
  } catch (error: any) {
    await ctx.answerCallbackQuery('Error al obtener la tasa de compra');
    return renderUI(
      ctx,
      `❌ ${error.message || 'You do not have a rate assigned for this brand and country. Contact the administrator.'}`,
      {
        reply_markup: new InlineKeyboard().text('🏠 Volver', 'start'),
      },
    );
  }

  const giftcards = await prisma.giftcard.findMany({
    where: { id: { in: selectedGiftcardIds }, inStock: true, status: 'UNUSED' },
    select: { id: true, amount: true, brandCountryId: true, escalationTier: true, claimCode: true, pinCode: true },
  });

  const buyerBuyRate = Math.floor(Number(buyRate) * 100);
  const blockedCards = giftcards.filter((c) => c.escalationTier > buyerBuyRate);
  if (blockedCards.length > 0) {
    await ctx.answerCallbackQuery('Algunas tarjetas cambiaron de tier. Intentá de nuevo.');
    return renderUI(ctx, '😔 Algunas tarjetas ya no están disponibles para tu tasa. Intentá de nuevo con /buy.', {
      reply_markup: new InlineKeyboard().text('🛒 Nueva búsqueda', 'buy_start'),
    });
  }

  if (giftcards.length === 0) {
    await ctx.answerCallbackQuery('Las tarjetas ya no están disponibles');
    return renderUI(ctx, '😔 Las tarjetas ya fueron compradas por otra persona. Intentá de nuevo con /buy.', {
      reply_markup: new InlineKeyboard().text('⬅️ Intentar de nuevo', 'buy_start'),
    });
  }

  const total = giftcards.reduce((s, c) => s.plus(c.amount.mul(buyRate)), new Prisma.Decimal(0));

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: ctx.user.id,
          brandCountryId: giftcards[0]?.brandCountryId,
          total,
          buyRate: buyRate,
          status: 'PENDING',
        },
      });
      await reserveGiftcards(
        tx,
        giftcards.map((c) => c.id),
        created.id,
      );
      return created;
    });
  } catch (error) {
    if (error instanceof GiftcardReservationError) {
      await ctx.answerCallbackQuery('Las tarjetas ya no están disponibles');
      return renderUI(ctx, '😔 Las tarjetas ya fueron compradas por otra persona. Intentá de nuevo con /buy.', {
        reply_markup: new InlineKeyboard().text('⬅️ Intentar de nuevo', 'buy_start'),
      });
    }
    throw error;
  }

  ctx.session.wizard.selectedGiftcardIds = undefined;

  const decryptedCards = giftcards.map((g) => ({
    code: decrypt(g.claimCode),
    amount: g.amount,
    pin: g.pinCode ? decrypt(g.pinCode) : null,
  }));

  const currency = ctx.session.wizard.countryCurrency || 'USD';
  const cardsText = decryptedCards
    .map((c, i) => {
      const pinPart = c.pin ? ` | PIN: <code>${escapeHTML(c.pin)}</code>` : '';
      return `${i + 1}. <code>${escapeHTML(c.code)}</code> — ${fmt$(c.amount, currency)}${pinPart}`;
    })
    .join('\n');

  const kb = new InlineKeyboard()
    .text('✅ Confirmar uso', `confirm_usage_${order.id}`)
    .row()
    .text('🚩 Reportar problema', `report_issues_${order.id}`)
    .row()
    .text('📋 Ver Mis órdenes', 'my_orders');

  await renderUI(
    ctx,
    `✅ <b>¡Orden creada!</b>\n\n` +
      `ID: <code>${order.id}</code>\n` +
      `Total a pagar: <b>${fmt$(total, 'USD')}</b>\n\n` +
      `<b>Códigos para aplicar:</b>\n${cardsText}\n\n` +
      `📝 <i>Aplicá los códigos, luego confirmá el uso desde los botones de abajo.</i>`,
    { parse_mode: 'HTML', reply_markup: kb, callbackText: '¡Orden creada!' },
  );
}

export async function handleBuyCancel(ctx: BuyerContext) {
  ctx.session.wizard.step = 'idle';
  ctx.session.wizard.selectedGiftcardIds = undefined;
  await renderUI(ctx, '❌ Compra cancelada.', {
    reply_markup: new InlineKeyboard().text('🏠 Inicio', 'start').row().text('🛒 Comprar tarjetas', 'buy_start'),
  });
}
