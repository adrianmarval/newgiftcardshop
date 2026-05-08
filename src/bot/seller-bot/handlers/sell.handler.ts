import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { encrypt, hashCode } from '@/lib/encryption';
import { normalizeClaimCode, formatClaimCodeCanonical, parseClaimCodes } from '@/lib/utils/claim-code-parser';
import type { ParsedGiftcard } from '@/types/domain/giftcard';
import { Prisma } from '@/generated/prisma/client';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$, fmtRate } from '@/bot/shared/formatters.js';

// ── Step 1: Elegir Brand ──────────────────────────────────────────────────────

export async function startSellWizard(ctx: SellerContext) {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: { countries: { where: { isActive: true }, include: { country: true } } },
    orderBy: { name: 'asc' },
  });

  const activeBrands = brands.filter((b) => b.countries.length > 0);
  if (activeBrands.length === 0) {
    return ctx.reply('❌ No active brands available. Please contact the administrator.');
  }

  const kb = new InlineKeyboard();
  for (const brand of activeBrands) {
    kb.text(`${brand.icon} ${brand.name}`, `sell_brand_${brand.id}`).row();
  }
  kb.text('❌ Cancel', 'sell_cancel');

  ctx.session.wizard.step = 'idle';

  return ctx.reply('🏷️ <b>Which brand are you publishing?</b>', {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

// ── Step 2: Choose Country ────────────────────────────────────────────────────

export async function handleBrandSelected(ctx: SellerContext) {
  const brandId = ctx.callbackQuery?.data?.replace('sell_brand_', '');
  if (!brandId) return ctx.answerCallbackQuery();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { countries: { where: { isActive: true }, include: { country: true } } },
  });

  if (!brand) return ctx.answerCallbackQuery('Brand not found');

  ctx.session.wizard.brandId = brand.id;
  ctx.session.wizard.brandName = brand.name;

  const kb = new InlineKeyboard();
  for (const bc of brand.countries) {
    kb.text(`${bc.country.name}`, `sell_country_${bc.country.id}`).row();
  }
  kb.text('⬅️ Back', 'sell_start').row().text('❌ Cancel', 'sell_cancel');

  await ctx.editMessageText(
    `🌍 <b>Country for ${brand.icon} ${brand.name}:</b>`,
    { parse_mode: 'HTML', reply_markup: kb },
  );
  return ctx.answerCallbackQuery();
}

// ── Step 3: Enter Codes ───────────────────────────────────────────────────────

export async function handleCountrySelected(ctx: SellerContext) {
  const countryId = ctx.callbackQuery?.data?.replace('sell_country_', '');
  if (!countryId) return ctx.answerCallbackQuery();

  const country = await prisma.country.findUnique({ where: { id: countryId } });
  if (!country) return ctx.answerCallbackQuery('Country not found');

  const { brandId } = ctx.session.wizard;
  if (!brandId) return ctx.answerCallbackQuery('Start over with /sell');

  const brandCountry = await prisma.brandCountry.findUnique({
    where: { brandId_countryId: { brandId, countryId } },
  });
  if (!brandCountry) return ctx.answerCallbackQuery('Invalid combination');

  ctx.session.wizard.countryId = country.id;
  ctx.session.wizard.countryName = country.name;
  ctx.session.wizard.brandCountryId = brandCountry.id;
  ctx.session.wizard.step = 'awaitingCodes';

  await ctx.editMessageText(
    `📝 <b>Enter the codes</b>\n\n` +
      `Brand: <b>${ctx.session.wizard.brandName} — ${country.name}</b>\n\n` +
      `Format (one per line):\n` +
      `<code>CODE AMOUNT</code>\n` +
      `<code>CODE AMOUNT PIN</code>\n\n` +
      `Example:\n` +
      `<code>ABCD-123456-7890 25</code>\n` +
      `<code>EFGH-098765-4321 50 1234</code>`,
    { parse_mode: 'HTML' },
  );
  return ctx.answerCallbackQuery();
}

// ── Step 4: Parse and confirm ────────────────────────────────────────────────

export async function handleCodesText(ctx: SellerContext) {
  if (ctx.session.wizard.step !== 'awaitingCodes') return;

  const text = (ctx.message as any)?.text as string | undefined;
  if (!text) return;

  const { parsed: cards, errors } = parseClaimCodes(text);

  if (cards.length === 0) {
    return ctx.reply(
      `❌ <b>No valid codes found.</b>\n\n` +
        `${errors.length > 0 ? `<b>Errors detected:</b>\n${errors.join('\n')}\n\n` : ''}` +
        `Check the format and try again.`,
      { parse_mode: 'HTML' },
    );
  }

  const totalFace = cards.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);

  let confirmMsg =
    `✅ <b>PROCESSED: ${cards.length} valid card(s)</b>\n` +
    `💰 Total value: <b>${fmt$(totalFace)}</b>\n\n` +
    cards.map((c, i) => `${i + 1}. <code>${c.claimCode}</code> — ${fmt$(c.amount || '0')}${c.pinCode ? ` (PIN: <code>${c.pinCode}</code>)` : ''}`).join('\n') +
    '\n\n';

  if (errors.length > 0) {
    confirmMsg +=
      `🚨 <b>WARNING! ERRORS FOUND (${errors.length})</b>\n` +
      `<i>These lines will NOT be published:</i>\n` +
      `<code>${errors.join('\n')}</code>\n\n` +
      `⚠️ <b>Do you want to continue with only the valid cards?</b>`;
  } else {
    confirmMsg += 'Publish these cards?';
  }

  // Guardar en sesión temporalmente usando storedMessageIds como indicador
  ctx.session.storedMessageIds = ctx.session.storedMessageIds ?? [];

  const kb = new InlineKeyboard()
    .text('✅ Publish', 'sell_confirm')
    .text('❌ Cancel', 'sell_cancel');

  const sent = await ctx.reply(confirmMsg, { parse_mode: 'HTML', reply_markup: kb });
  ctx.session.storedMessageIds = [sent.message_id];
  (ctx.session as any)._pendingCards = JSON.stringify(cards);
}

// ── Step 5: Publish ──────────────────────────────────────────────────────────

export async function handleSellConfirm(ctx: SellerContext) {
  const pendingCardsRaw = (ctx.session as any)._pendingCards as string | undefined;
  const { brandCountryId } = ctx.session.wizard;

  if (!pendingCardsRaw || !brandCountryId) {
    await ctx.answerCallbackQuery('Session expired, start over with /sell');
    return;
  }

  const cards: ParsedGiftcard[] = JSON.parse(pendingCardsRaw);

  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { sellRate: true },
  });

  if (!user) return ctx.answerCallbackQuery('User not found');

  const codeHashes = cards.map((c) => hashCode(c.claimCode.toUpperCase()));
  const existing = await prisma.giftcard.findMany({
    where: { codeHash: { in: codeHashes }, brandCountryId },
    select: { codeHash: true },
  });
  const existingSet = new Set(existing.map((e) => e.codeHash));

  const uniqueCards = cards.filter((c, i) => !existingSet.has(codeHashes[i]));
  const duplicates = cards.length - uniqueCards.length;

  if (uniqueCards.length === 0) {
    await ctx.editMessageText('⚠️ All codes already exist in inventory.');
    return ctx.answerCallbackQuery();
  }

  const batch = await prisma.$transaction(async (tx) => {
    const createdBatch = await tx.giftcardBatch.create({
      data: { userId: ctx.user.id, sellRate: user.sellRate, isPaid: false },
    });

    for (const card of uniqueCards) {
      await tx.giftcard.create({
        data: {
          claimCode: encrypt(card.claimCode),
          codeHash: hashCode(card.claimCode),
          pinCode: card.pinCode ? encrypt(card.pinCode) : null,
          amount: new Prisma.Decimal(parseFloat(card.amount || '0')),
          ownerId: ctx.user.id,
          inStock: true,
          status: 'UNUSED',
          batchId: createdBatch.id,
          brandCountryId,
        },
      });
    }

    return createdBatch;
  });

  ctx.session.wizard.step = 'idle';
  (ctx.session as any)._pendingCards = undefined;
  ctx.session.storedMessageIds = [];

  const totalFace = uniqueCards.reduce((s, c) => s + parseFloat(c.amount || '0'), 0);
  const payout = totalFace * Number(user.sellRate);

  let msg =
    `🎉 <b>Batch #${batch.id} published</b>\n\n` +
    `📦 ${uniqueCards.length} card(s) · ${fmt$(totalFace)} face value\n` +
    `💸 You earn: <b>${fmt$(payout)}</b> (rate ${fmtRate(user.sellRate)})\n`;

  if (duplicates > 0) msg += `\n⚠️ ${duplicates} duplicate code(s) ignored.`;

  const kb = new InlineKeyboard()
    .text('📦 View My Batches', 'my_batches')
    .row()
    .text('➕ Publish More', 'sell_start');

  await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  return ctx.answerCallbackQuery('✅ Published');
}

// ── Cancel ──────────────────────────────────────────────────────────────────

export async function handleSellCancel(ctx: SellerContext) {
  ctx.session.wizard.step = 'idle';
  (ctx.session as any)._pendingCards = undefined;

  await ctx.editMessageText('❌ Operation cancelled.');
  return ctx.answerCallbackQuery();
}
